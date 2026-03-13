export interface AppConfig {
    DATABASE_URLS: string[];
    PORT: number;
    APP_URL: string;
    CORS_ORIGINS: string[];
    DEFAULT_EXPIRATION_HOURS: number;
    REDIS_URL: string;
    MACHINE_ID: number;
    NODE_ENV: 'development' | 'test' | 'production';
    ENABLE_DOCS: boolean;
    ADMIN_TOKEN: string;
    BLOCK_PRIVATE_TARGETS: boolean;
    MAX_URL_LENGTH: number;
    MAX_REQUEST_BODY_BYTES: number;
    RATE_LIMIT_WINDOW_SECONDS: number;
    RATE_LIMIT_MAX_SHORTEN: number;
    RATE_LIMIT_MAX_STATS: number;
    RATE_LIMIT_MAX_REDIRECT: number;
    RATE_LIMIT_MAX_HEALTH: number;
}
