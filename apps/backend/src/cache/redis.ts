import Redis from 'ioredis';
import { env } from '../config/env';

/**
 * Redis cache service using ioredis.
 *
 * Works with both:
 * - Local Redis (dev):  REDIS_URL=redis://localhost:6379
 * - Upstash    (prod):  REDIS_URL=rediss://default:TOKEN@endpoint.upstash.io:6379
 *
 * Implements Cache-Aside (Lazy Loading) pattern:
 * 1. Check cache first
 * 2. On MISS → query DB → store in cache with TTL
 * 3. On HIT → return cached value (~1ms vs ~5-20ms from DB)
 */

// Simple hit/miss counter for observability
const metrics = {
    hits: 0,
    misses: 0,
    get hitRate() {
        const total = this.hits + this.misses;
        return total === 0 ? 0 : Math.round((this.hits / total) * 100);
    },
};

let redis: Redis | null = null;

function getRedis(): Redis | null {
    if (redis) return redis;

    if (!env.REDIS_URL) {
        console.warn('⚠️  REDIS_URL not set. Cache disabled.');
        return null;
    }

    redis = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            if (times > 3) return null; // Stop retrying after 3 attempts
            return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
    });

    redis.on('connect', () => console.log('✅ Redis cache connected'));
    redis.on('error', (err) => console.error('❌ Redis error:', err.message));

    redis.connect().catch(() => {
        console.warn('⚠️  Could not connect to Redis. Cache disabled.');
        redis = null;
    });

    return redis;
}

const CACHE_PREFIX = 'url:';
const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export const cacheService = {
    /**
     * Get a cached URL by short code.
     * Returns null on cache miss or if Redis is not available.
     */
    async get(shortCode: string): Promise<string | null> {
        const client = getRedis();
        if (!client) return null;

        try {
            const cached = await client.get(`${CACHE_PREFIX}${shortCode}`);

            if (cached) {
                metrics.hits++;
                console.log(`🟢 Cache HIT: ${shortCode} (hit rate: ${metrics.hitRate}%)`);
                return cached;
            }

            metrics.misses++;
            console.log(`🔴 Cache MISS: ${shortCode} (hit rate: ${metrics.hitRate}%)`);
            return null;
        } catch (err) {
            console.error('Cache GET error:', err);
            return null; // Graceful degradation
        }
    },

    /**
     * Store a URL in cache with TTL.
     */
    async set(shortCode: string, originalUrl: string, ttlSeconds: number = DEFAULT_TTL_SECONDS): Promise<void> {
        const client = getRedis();
        if (!client) return;

        try {
            await client.set(`${CACHE_PREFIX}${shortCode}`, originalUrl, 'EX', ttlSeconds);
        } catch (err) {
            console.error('Cache SET error:', err);
        }
    },

    /**
     * Remove a URL from cache (invalidation).
     */
    async del(shortCode: string): Promise<void> {
        const client = getRedis();
        if (!client) return;

        try {
            await client.del(`${CACHE_PREFIX}${shortCode}`);
        } catch (err) {
            console.error('Cache DEL error:', err);
        }
    },

    /**
     * Get current cache metrics.
     */
    getMetrics() {
        return {
            hits: metrics.hits,
            misses: metrics.misses,
            hitRate: metrics.hitRate,
            connected: redis?.status === 'ready',
        };
    },
};
