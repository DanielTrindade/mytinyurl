import { describe, expect, test } from 'bun:test';
import {
    InMemoryRateLimitStore,
    getClientIdentity,
    resolveRateLimitRule,
} from './rate-limit';
import type { AppConfig } from '../config/types';

const config: AppConfig = {
    DATABASE_URLS: ['postgresql://user:password@localhost:5432/mytinyurl'],
    PORT: 3000,
    APP_URL: 'http://localhost:3000',
    CORS_ORIGINS: ['http://localhost:5173'],
    DEFAULT_EXPIRATION_HOURS: 24,
    REDIS_URL: '',
    MACHINE_ID: 1,
    NODE_ENV: 'test',
    ENABLE_DOCS: false,
    ADMIN_TOKEN: '',
    BLOCK_PRIVATE_TARGETS: true,
    MAX_URL_LENGTH: 2048,
    MAX_REQUEST_BODY_BYTES: 4096,
    RATE_LIMIT_WINDOW_SECONDS: 60,
    RATE_LIMIT_MAX_SHORTEN: 2,
    RATE_LIMIT_MAX_STATS: 3,
    RATE_LIMIT_MAX_REDIRECT: 4,
    RATE_LIMIT_MAX_HEALTH: 5,
};

describe('InMemoryRateLimitStore', () => {
    test('increments and reports retry time', async () => {
        const store = new InMemoryRateLimitStore();

        const first = await store.consume('rate:1', 60);
        const second = await store.consume('rate:1', 60);

        expect(first.count).toBe(1);
        expect(second.count).toBe(2);
        expect(second.retryAfterSeconds).toBeGreaterThan(0);
    });
});

describe('resolveRateLimitRule', () => {
    test('maps shorten, stats, redirect, and health routes', () => {
        expect(resolveRateLimitRule('POST', '/api/shorten', config)?.name).toBe('shorten');
        expect(resolveRateLimitRule('GET', '/api/urls/abc123/stats', config)?.name).toBe('stats');
        expect(resolveRateLimitRule('GET', '/abc123', config)?.name).toBe('redirect');
        expect(resolveRateLimitRule('GET', '/health', config)?.name).toBe('health');
        expect(resolveRateLimitRule('GET', '/docs', config)).toBeNull();
    });
});

describe('getClientIdentity', () => {
    test('prefers x-forwarded-for and falls back to anonymous', () => {
        expect(getClientIdentity({ 'x-forwarded-for': '198.51.100.10, 10.0.0.1' })).toBe(
            '198.51.100.10'
        );
        expect(getClientIdentity({})).toBe('anonymous');
    });
});
