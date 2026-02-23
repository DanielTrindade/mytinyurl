const envSchema = {
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/mytinyurl',
    PORT: Number(process.env.PORT) || 3000,
    APP_URL: process.env.APP_URL || 'http://localhost:3000',
    CORS_ORIGINS: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
        : ['http://localhost:5173'],
    DEFAULT_EXPIRATION_HOURS: Number(process.env.DEFAULT_EXPIRATION_HOURS) || 24,

    // Redis — works with both local and Upstash
    // Dev:  redis://localhost:6379
    // Prod: rediss://default:TOKEN@endpoint.upstash.io:6379
    REDIS_URL: process.env.REDIS_URL || '',
} as const;

// Validate required env vars
function validateEnv() {
    if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
        throw new Error('DATABASE_URL is required in production');
    }
}

validateEnv();

export const env = envSchema;
