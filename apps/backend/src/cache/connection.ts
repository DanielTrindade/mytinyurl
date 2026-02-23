import Redis from 'ioredis';
import { env } from '../config/env';

/**
 * Shared Redis connection — used by both cache and event streaming.
 * Lazy-initialized: returns null if REDIS_URL is not set.
 */

let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
    if (redis) return redis;

    if (!env.REDIS_URL) {
        console.warn('⚠️  REDIS_URL not set. Redis features disabled.');
        return null;
    }

    redis = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            if (times > 3) return null;
            return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
    });

    redis.on('connect', () => console.log('✅ Redis connected'));
    redis.on('error', (err) => console.error('❌ Redis error:', err.message));

    redis.connect().catch(() => {
        console.warn('⚠️  Could not connect to Redis.');
        redis = null;
    });

    return redis;
}

/**
 * Get the raw Redis status.
 */
export function isRedisConnected(): boolean {
    return redis?.status === 'ready';
}
