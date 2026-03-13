import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import type { AppConfig } from './config/types';
import { errorHandler } from './middleware/error-handler';
import { createSecurityPlugin } from './middleware/security';
import { createRedirectRoutes, createUrlRoutes, type UrlRoutesService } from './modules/url/url.routes';
import type { RateLimitStore } from './middleware/rate-limit';

export interface AppDependencies {
    config: AppConfig;
    urlService: UrlRoutesService;
    getCacheMetrics: () => Record<string, unknown>;
    getEventMetrics: () => Record<string, unknown>;
    getShardCount: () => number;
    rateLimitStore?: RateLimitStore;
}

export function buildApp({
    config,
    urlService,
    getCacheMetrics,
    getEventMetrics,
    getShardCount,
    rateLimitStore,
}: AppDependencies) {
    const app = new Elysia()
        .use(
            createSecurityPlugin({
                config,
                rateLimitStore,
            })
        )
        .use(
            cors({
                origin: config.CORS_ORIGINS,
                methods: ['GET', 'POST', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'X-Stats-Token', 'X-Admin-Token'],
                credentials: false,
            })
        )
        .get('/health', () => ({
            status: 'ok' as const,
            timestamp: new Date().toISOString(),
        }));

    if (config.ENABLE_DOCS) {
        app.use(
            swagger({
                path: '/docs',
                documentation: {
                    info: {
                        title: 'MyTinyURL API',
                        description: 'URL Shortener API - hardened build',
                        version: '2.1.0',
                    },
                    tags: [
                        { name: 'URLs', description: 'URL shortening endpoints' },
                        { name: 'Redirect', description: 'URL redirection' },
                        { name: 'System', description: 'System endpoints' },
                    ],
                },
            })
        );
    } else {
        app.get('/docs', ({ set }) => {
            set.status = 404;
            return {
                error: 'NOT_FOUND',
                message: 'Documentation is disabled',
                statusCode: 404,
            };
        });
    }

    const adminHealthProvider =
        config.ADMIN_TOKEN || config.NODE_ENV !== 'production'
            ? () => ({
                status: 'ok',
                timestamp: new Date().toISOString(),
                cache: getCacheMetrics(),
                events: getEventMetrics(),
                shards: getShardCount(),
            })
            : undefined;

    return app
        .use(
            createUrlRoutes({
                config,
                urlService,
                getAdminHealth: adminHealthProvider,
            })
        )
        .use(createRedirectRoutes(urlService))
        .use(errorHandler);
}
