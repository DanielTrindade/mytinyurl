import { eq, sql } from 'drizzle-orm';
import { urls, type Url } from '../../db/schema';
import { shardRouter } from '../../db';
import { generateShortCode } from '../../shared/short-code';
import { NotFoundError, GoneError } from '../../shared/errors';
import { cacheService } from '../../cache/redis';
import { env } from '../../config/env';

export class UrlService {
    /**
     * Creates a new shortened URL.
     * 1. Generate Snowflake short code
     * 2. Determine target shard via consistent hashing
     * 3. Insert into the correct shard
     * 4. Write-through to Redis cache
     */
    async createShortUrl(originalUrl: string): Promise<Url> {
        const shortCode = generateShortCode();

        // Shard Router determines which PostgreSQL instance
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
     * Cache-Aside pattern + Shard-aware DB lookup.
     */
    async redirectUrl(shortCode: string): Promise<string> {
        // 1. Check cache first
        const cached = await cacheService.get(shortCode);
        if (cached) {
            // Cache HIT — fire-and-forget visit increment on correct shard
            const db = shardRouter.getDb(shortCode);
            db.update(urls)
                .set({
                    visits: sql`${urls.visits} + 1`,
                    updatedAt: new Date(),
                })
                .where(eq(urls.shortCode, shortCode))
                .then(() => { })
                .catch((err) => console.error('Failed to increment visits:', err));

            return cached;
        }

        // 2. Cache MISS — query the correct shard
        const db = shardRouter.getDb(shortCode);
        const shardIndex = shardRouter.getShardIndex(shortCode);
        console.log(`🔍 Reading from shard ${shardIndex}: ${shortCode}`);

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

        // Increment visits (fire-and-forget)
        db.update(urls)
            .set({
                visits: sql`${urls.visits} + 1`,
                updatedAt: new Date(),
            })
            .where(eq(urls.shortCode, shortCode))
            .then(() => { })
            .catch((err) => console.error('Failed to increment visits:', err));

        return url.originalUrl;
    }

    /**
     * Gets URL statistics by short code — always from the correct shard.
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

// Singleton instance
export const urlService = new UrlService();
