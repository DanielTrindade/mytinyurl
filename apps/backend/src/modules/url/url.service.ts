import { eq } from 'drizzle-orm';
import { urls, type Url } from '../../db/schema';
import { shardRouter } from '../../db';
import { generateShortCode } from '../../shared/short-code';
import {
    ConflictError,
    GoneError,
    NotFoundError,
    UnauthorizedError,
} from '../../shared/errors';
import { cacheService } from '../../cache/redis';
import { eventProducer } from '../../events/producer';
import { env } from '../../config/env';
import { generateOpaqueToken } from '../../shared/random';
import { validateDestinationUrl } from '../../shared/url-safety';

export class UrlService {
    /**
     * Creates a new shortened URL using an opaque short code and a per-link
     * stats token that must be presented to read analytics.
     */
    async createShortUrl(originalUrl: string): Promise<Url> {
        const normalizedUrl = validateDestinationUrl(originalUrl, {
            allowPrivateTargets: !env.BLOCK_PRIVATE_TARGETS,
            maxLength: env.MAX_URL_LENGTH,
        });

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + env.DEFAULT_EXPIRATION_HOURS);
        const ttlSeconds = env.DEFAULT_EXPIRATION_HOURS * 60 * 60;

        for (let attempt = 0; attempt < 5; attempt++) {
            const shortCode = generateShortCode();
            const statsToken = generateOpaqueToken();
            const db = shardRouter.getDb(shortCode);
            const shardIndex = shardRouter.getShardIndex(shortCode);

            console.log(`Creating URL on shard ${shardIndex}: ${shortCode}`);

            try {
                const [newUrl] = await db
                    .insert(urls)
                    .values({
                        originalUrl: normalizedUrl,
                        shortCode,
                        statsToken,
                        expiresAt,
                    })
                    .returning();

                await cacheService.set(shortCode, normalizedUrl, ttlSeconds);
                return newUrl;
            } catch (error: any) {
                if (error?.code === '23505') {
                    continue;
                }

                throw error;
            }
        }

        throw new ConflictError('Could not generate a unique short code');
    }

    async redirectUrl(shortCode: string): Promise<string> {
        const cached = await cacheService.get(shortCode);
        if (cached) {
            void eventProducer.publishVisit(shortCode);
            return cached;
        }

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

        const ttlSeconds = url.expiresAt
            ? Math.max(1, Math.floor((url.expiresAt.getTime() - Date.now()) / 1000))
            : env.DEFAULT_EXPIRATION_HOURS * 60 * 60;
        await cacheService.set(shortCode, url.originalUrl, ttlSeconds);

        void eventProducer.publishVisit(shortCode);

        return url.originalUrl;
    }

    async getUrlStats(shortCode: string, statsToken: string): Promise<Url> {
        if (!statsToken) {
            throw new UnauthorizedError('Stats token is required');
        }

        const db = shardRouter.getDb(shortCode);
        const url = await db.query.urls.findFirst({
            where: eq(urls.shortCode, shortCode),
        });

        if (!url) {
            throw new NotFoundError(`URL with code '${shortCode}' not found`);
        }

        if (url.statsToken !== statsToken) {
            throw new NotFoundError(`URL with code '${shortCode}' not found`);
        }

        return url;
    }
}

export const urlService = new UrlService();
