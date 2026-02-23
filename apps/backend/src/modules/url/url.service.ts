import { eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { urls, type Url, type NewUrl } from '../../db/schema';
import { generateUniqueShortCode } from '../../shared/short-code';
import { NotFoundError, GoneError, ConflictError } from '../../shared/errors';
import { cacheService } from '../../cache/redis';
import { env } from '../../config/env';

export class UrlService {
    /**
     * Creates a new shortened URL.
     * Uses write-through: stores in DB and populates cache immediately.
     */
    async createShortUrl(originalUrl: string): Promise<Url> {
        const shortCode = await generateUniqueShortCode(async (code) => {
            const existing = await db.query.urls.findFirst({
                where: eq(urls.shortCode, code),
            });
            return !!existing;
        });

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

        // Write-through: populate cache on creation
        const ttlSeconds = env.DEFAULT_EXPIRATION_HOURS * 60 * 60;
        await cacheService.set(shortCode, originalUrl, ttlSeconds);

        return newUrl;
    }

    /**
     * Finds a URL by its short code and redirects.
     * Implements Cache-Aside (Lazy Loading) pattern:
     * 1. Check Redis cache first
     * 2. On HIT → return immediately (skip DB query entirely)
     * 3. On MISS → query DB → store in cache → return
     */
    async redirectUrl(shortCode: string): Promise<string> {
        // 1. Check cache first
        const cached = await cacheService.get(shortCode);
        if (cached) {
            // Cache HIT — fire-and-forget visit increment
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

        // 2. Cache MISS — query database
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

        // 3. Populate cache for next time
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
     * Gets URL statistics by short code (always from DB for accuracy).
     */
    async getUrlStats(shortCode: string): Promise<Url> {
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
