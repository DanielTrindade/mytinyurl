const envSchema = {
    // Database — supports multiple shards (comma-separated URLs)
    // Single shard:  DATABASE_URLS=postgresql://user:pass@host:5432/mydb
    // Multi shard:   DATABASE_URLS=postgresql://...:5432/mydb,postgresql://...:5434/mydb
    DATABASE_URLS: (process.env.DATABASE_URLS || process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/mytinyurl')
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean),

    PORT: Number(process.env.PORT) || 3000,
    APP_URL: process.env.APP_URL || 'http://localhost:3000',
    CORS_ORIGINS: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
        : ['http://localhost:5173'],
    DEFAULT_EXPIRATION_HOURS: Number(process.env.DEFAULT_EXPIRATION_HOURS) || 24,

    // Redis
    // Dev:  redis://localhost:6379
    // Prod: rediss://default:TOKEN@endpoint.upstash.io:6379
    REDIS_URL: process.env.REDIS_URL || '',

    // Snowflake ID: machine identifier (0-1023)
    MACHINE_ID: Number(process.env.MACHINE_ID) || 1,
} as const;

// Validate required env vars
function validateEnv() {
    if (envSchema.DATABASE_URLS.length === 0) {
        throw new Error('At least one DATABASE_URL or DATABASE_URLS is required');
    }
}

validateEnv();

export const env = envSchema;
