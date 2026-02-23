import { Elysia, t } from 'elysia';
import { urlService } from './url.service';
import { cacheService } from '../../cache/redis';
import { shardRouter } from '../../db';
import { env } from '../../config/env';

/**
 * API routes for URL management (/api prefix).
 * Following Elysia best practice: Elysia instance = controller.
 */
export const urlRoutes = new Elysia({ prefix: '/api' })
    .post(
        '/shorten',
        async ({ body }) => {
            const url = await urlService.createShortUrl(body.url);

            return {
                id: url.id,
                originalUrl: url.originalUrl,
                shortCode: url.shortCode,
                shortUrl: `${env.APP_URL}/${url.shortCode}`,
                expiresAt: url.expiresAt,
                createdAt: url.createdAt,
            };
        },
        {
            body: t.Object({
                url: t.String({ format: 'uri' }),
            }),
            detail: {
                tags: ['URLs'],
                summary: 'Create a short URL',
                description: 'Creates a new shortened URL with automatic expiration',
            },
        }
    )
    .get(
        '/urls/:shortCode/stats',
        async ({ params }) => {
            const url = await urlService.getUrlStats(params.shortCode);

            return {
                id: url.id,
                originalUrl: url.originalUrl,
                shortCode: url.shortCode,
                shortUrl: `${env.APP_URL}/${url.shortCode}`,
                visits: url.visits,
                isActive: url.isActive,
                createdAt: url.createdAt,
                updatedAt: url.updatedAt,
                expiresAt: url.expiresAt,
            };
        },
        {
            params: t.Object({
                shortCode: t.String(),
            }),
            detail: {
                tags: ['URLs'],
                summary: 'Get URL statistics',
                description: 'Returns statistics for a shortened URL including visit count',
            },
        }
    )
    .get('/health', () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
        cache: cacheService.getMetrics(),
        shards: shardRouter.shardCount,
    }), {
        detail: {
            tags: ['System'],
            summary: 'Health check',
        },
    });

/**
 * Redirect route (no /api prefix — root level).
 */
export const redirectRoutes = new Elysia().get(
    '/:shortCode',
    async ({ params, redirect }) => {
        const originalUrl = await urlService.redirectUrl(params.shortCode);
        return redirect(originalUrl, 302);
    },
    {
        params: t.Object({
            shortCode: t.String(),
        }),
        detail: {
            tags: ['Redirect'],
            summary: 'Redirect to original URL',
            description: 'Redirects to the original URL and increments visit count',
        },
    }
);
