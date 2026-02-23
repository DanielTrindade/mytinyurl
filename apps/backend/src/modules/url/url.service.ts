import { eq, sql } from 'drizzle-orm';
import { urls, type Url } from '../../db/schema';
import { shardRouter } from '../../db';
import { generateShortCode } from '../../shared/short-code';
import { NotFoundError, GoneError } from '../../shared/errors';
import { cacheService } from '../../cache/redis';
import { eventProducer } from '../../events/producer';
import { env } from '../../config/env';

export class UrlService {
    /**
     * Creates a new shortened URL.
     * Snowflake ID → base62 → consistent hash → correct shard.
     */
    async createShortUrl(originalUrl: string): Promise<Url> {
        const shortCode = generateShortCode();

        const db = shardRouter.getDb(shortCode);
        const shardIndex = shardRouter.getShardIndex(shortCode);
        console.log(`📝 Creating URL on shard ${shardIndex}: ${shortCode}`);

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + env.DEFAULT_EXPIRATION_HOURS);

        const [newUrl] = await db
            .insert(urls)
            .values({
                originalUrl,
                shortCode,
                expiresAt,
            })
            .returning();

        // Write-through: populate cache
        const ttlSeconds = env.DEFAULT_EXPIRATION_HOURS * 60 * 60;
        await cacheService.set(shortCode, originalUrl, ttlSeconds);

        return newUrl;
    }

    /**
     * Finds a URL by its short code and redirects.
     *
     * Flow:
     * 1. Check Redis cache
     * 2. On MISS → query correct shard → populate cache
     * 3. Publish visit event to Redis Stream (NOT a direct DB write)
     *    → The analytics worker will batch-process these events
     */
    async redirectUrl(shortCode: string): Promise<string> {
        // 1. Check cache first
        const cached = await cacheService.get(shortCode);
        if (cached) {
            // Publish visit event (fire-and-forget, < 2ms)
            eventProducer.publishVisit(shortCode);
            return cached;
        }

        // 2. Cache MISS — query the correct shard
        const db = shardRouter.getDb(shortCode);

        const url = await db.query.urls.findFirst({
            where: eq(urls.shortCode, shortCode),
        });

        if (!url) {
            throw new NotFoundError(`URL with code '${shortCode}' not found`);
        }

        if (!url.isActive) {
            throw new GoneError('This URL has been deactivated');
        }

        if (url.expiresAt && url.expiresAt < new Date()) {
            throw new GoneError('This URL has expired');
        }

        // 3. Populate cache
        const ttlSeconds = url.expiresAt
            ? Math.max(1, Math.floor((url.expiresAt.getTime() - Date.now()) / 1000))
            : env.DEFAULT_EXPIRATION_HOURS * 60 * 60;
        await cacheService.set(shortCode, url.originalUrl, ttlSeconds);

        // Publish visit event instead of direct DB update
        eventProducer.publishVisit(shortCode);

        return url.originalUrl;
    }

    /**
     * Gets URL statistics — always from DB for accuracy.
     */
    async getUrlStats(shortCode: string): Promise<Url> {
        const db = shardRouter.getDb(shortCode);

        const url = await db.query.urls.findFirst({
            where: eq(urls.shortCode, shortCode),
        });

        if (!url) {
            throw new NotFoundError(`URL with code '${shortCode}' not found`);
        }

        return url;
    }
}

export const urlService = new UrlService();
