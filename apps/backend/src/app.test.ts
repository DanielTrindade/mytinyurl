import { describe, expect, test } from 'bun:test';
import { buildApp } from './app';
import type { AppConfig } from './config/types';
import { InMemoryRateLimitStore } from './middleware/rate-limit';
import { NotFoundError, UnauthorizedError } from './shared/errors';

function createConfig(overrides: Partial<AppConfig> = {}): AppConfig {
    return {
        DATABASE_URLS: ['postgresql://user:password@localhost:5432/mytinyurl'],
        PORT: 3000,
        APP_URL: 'https://sho.rt',
        CORS_ORIGINS: ['https://sho.rt'],
        DEFAULT_EXPIRATION_HOURS: 24,
        REDIS_URL: '',
        MACHINE_ID: 1,
        NODE_ENV: 'test',
        ENABLE_DOCS: false,
        ADMIN_TOKEN: 'admin-secret',
        BLOCK_PRIVATE_TARGETS: true,
        MAX_URL_LENGTH: 2048,
        MAX_REQUEST_BODY_BYTES: 4096,
        RATE_LIMIT_WINDOW_SECONDS: 60,
        RATE_LIMIT_MAX_SHORTEN: 2,
        RATE_LIMIT_MAX_STATS: 2,
        RATE_LIMIT_MAX_REDIRECT: 5,
        RATE_LIMIT_MAX_HEALTH: 1,
        ...overrides,
    };
}

function createApp(configOverrides: Partial<AppConfig> = {}) {
    const now = new Date('2026-03-13T12:00:00.000Z');
    const config = createConfig(configOverrides);

    const urlRecord = {
        id: 'url-1',
        originalUrl: 'https://example.com/final',
        shortCode: 'Abc123Xy',
        statsToken: 'stats-secret-token',
        visits: 42,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        expiresAt: now,
    };

    const app = buildApp({
        config,
        urlService: {
            async createShortUrl(originalUrl) {
                return {
                    ...urlRecord,
                    originalUrl,
                };
            },
            async getUrlStats(shortCode, statsToken) {
                if (!statsToken) {
                    throw new UnauthorizedError('Stats token is required');
                }

                if (shortCode !== urlRecord.shortCode || statsToken !== urlRecord.statsToken) {
                    throw new NotFoundError('URL not found');
                }

                return urlRecord;
            },
            async redirectUrl(shortCode) {
                if (shortCode !== urlRecord.shortCode) {
                    throw new NotFoundError('URL not found');
                }

                return urlRecord.originalUrl;
            },
        },
        getCacheMetrics: () => ({ hits: 1, misses: 0 }),
        getEventMetrics: () => ({ published: 2, errors: 0 }),
        getShardCount: () => 2,
        rateLimitStore: new InMemoryRateLimitStore(),
    });

    return { app, urlRecord, config };
}

describe('buildApp security behavior', () => {
    test('returns minimal public health payload', async () => {
        const { app } = createApp();

        const response = await app.handle(new Request('http://localhost/health'));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.status).toBe('ok');
        expect(body.cache).toBeUndefined();
        expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    });

    test('protects admin health endpoint with token', async () => {
        const { app } = createApp();

        const unauthorized = await app.handle(
            new Request('http://localhost/api/admin/health')
        );
        expect(unauthorized.status).toBe(401);

        const authorized = await app.handle(
            new Request('http://localhost/api/admin/health', {
                headers: {
                    'x-admin-token': 'admin-secret',
                },
            })
        );
        const body = await authorized.json();

        expect(authorized.status).toBe(200);
        expect(body.cache).toEqual({ hits: 1, misses: 0 });
        expect(body.shards).toBe(2);
    });

    test('hides docs when disabled', async () => {
        const { app } = createApp({ ENABLE_DOCS: false });
        const response = await app.handle(new Request('http://localhost/docs'));

        expect(response.status).toBe(404);
    });

    test('requires a stats token for analytics access', async () => {
        const { app, urlRecord } = createApp();

        const missingToken = await app.handle(
            new Request(`http://localhost/api/urls/${urlRecord.shortCode}/stats`)
        );
        expect(missingToken.status).toBe(401);

        const ok = await app.handle(
            new Request(`http://localhost/api/urls/${urlRecord.shortCode}/stats`, {
                headers: {
                    'x-stats-token': urlRecord.statsToken,
                },
            })
        );
        const body = await ok.json();

        expect(ok.status).toBe(200);
        expect(body.visits).toBe(42);
        expect(body.statsToken).toBeUndefined();
    });

    test('enforces per-route rate limits', async () => {
        const { app } = createApp({ RATE_LIMIT_MAX_HEALTH: 1 });

        const headers = { 'x-forwarded-for': '198.51.100.22' };
        const first = await app.handle(
            new Request('http://localhost/health', { headers })
        );
        const second = await app.handle(
            new Request('http://localhost/health', { headers })
        );

        expect(first.status).toBe(200);
        expect(second.status).toBe(429);
        expect(second.headers.get('retry-after')).toBeTruthy();
    });
});
