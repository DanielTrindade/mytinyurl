import type { AppConfig } from './types';

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined) return fallback;

    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;

    return fallback;
}

function parseNumberEnv(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const nodeEnv = (process.env.NODE_ENV || 'development') as AppConfig['NODE_ENV'];
const defaultDatabaseUrl =
    nodeEnv === 'production' ? '' : 'postgresql://user:password@localhost:5432/mytinyurl';

const envSchema: AppConfig = {
    DATABASE_URLS: (process.env.DATABASE_URLS || process.env.DATABASE_URL || defaultDatabaseUrl)
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean),
    PORT: parseNumberEnv(process.env.PORT, 3000),
    APP_URL: process.env.APP_URL || 'http://localhost:3000',
    CORS_ORIGINS: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
        : ['http://localhost:5173'],
    DEFAULT_EXPIRATION_HOURS: parseNumberEnv(process.env.DEFAULT_EXPIRATION_HOURS, 24),
    REDIS_URL: process.env.REDIS_URL || '',
    MACHINE_ID: parseNumberEnv(process.env.MACHINE_ID, 1),
    NODE_ENV: ['development', 'test', 'production'].includes(nodeEnv) ? nodeEnv : 'development',
    ENABLE_DOCS: parseBooleanEnv(
        process.env.ENABLE_DOCS,
        process.env.NODE_ENV !== 'production'
    ),
    ADMIN_TOKEN: process.env.ADMIN_TOKEN || '',
    BLOCK_PRIVATE_TARGETS: parseBooleanEnv(process.env.BLOCK_PRIVATE_TARGETS, true),
    MAX_URL_LENGTH: parseNumberEnv(process.env.MAX_URL_LENGTH, 2048),
    MAX_REQUEST_BODY_BYTES: parseNumberEnv(process.env.MAX_REQUEST_BODY_BYTES, 4096),
    RATE_LIMIT_WINDOW_SECONDS: parseNumberEnv(process.env.RATE_LIMIT_WINDOW_SECONDS, 60),
    RATE_LIMIT_MAX_SHORTEN: parseNumberEnv(process.env.RATE_LIMIT_MAX_SHORTEN, 20),
    RATE_LIMIT_MAX_STATS: parseNumberEnv(process.env.RATE_LIMIT_MAX_STATS, 30),
    RATE_LIMIT_MAX_REDIRECT: parseNumberEnv(process.env.RATE_LIMIT_MAX_REDIRECT, 300),
    RATE_LIMIT_MAX_HEALTH: parseNumberEnv(process.env.RATE_LIMIT_MAX_HEALTH, 60),
};

function validateEnv() {
    if (envSchema.DATABASE_URLS.length === 0) {
        throw new Error('At least one DATABASE_URL or DATABASE_URLS is required');
    }

    if (envSchema.MAX_URL_LENGTH > envSchema.MAX_REQUEST_BODY_BYTES) {
        throw new Error('MAX_REQUEST_BODY_BYTES must be greater than or equal to MAX_URL_LENGTH');
    }

    if (envSchema.NODE_ENV === 'production' && envSchema.ENABLE_DOCS) {
        console.warn('ENABLE_DOCS is enabled in production. This should only be used temporarily.');
    }
}

validateEnv();

export const env = envSchema;
