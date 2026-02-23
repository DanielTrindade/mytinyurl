import { getRedisClient, isRedisConnected } from './connection';

/**
 * Redis cache service — Cache-Aside pattern.
 * Now uses shared Redis connection from connection.ts.
 */

const metrics = {
    hits: 0,
    misses: 0,
    get hitRate() {
        const total = this.hits + this.misses;
        return total === 0 ? 0 : Math.round((this.hits / total) * 100);
    },
};

const CACHE_PREFIX = 'url:';
const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export const cacheService = {
    async get(shortCode: string): Promise<string | null> {
        const client = getRedisClient();
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
            return null;
        }
    },

    async set(shortCode: string, originalUrl: string, ttlSeconds: number = DEFAULT_TTL_SECONDS): Promise<void> {
        const client = getRedisClient();
        if (!client) return;

        try {
            await client.set(`${CACHE_PREFIX}${shortCode}`, originalUrl, 'EX', ttlSeconds);
        } catch (err) {
            console.error('Cache SET error:', err);
        }
    },

    async del(shortCode: string): Promise<void> {
        const client = getRedisClient();
        if (!client) return;

        try {
            await client.del(`${CACHE_PREFIX}${shortCode}`);
        } catch (err) {
            console.error('Cache DEL error:', err);
        }
    },

    getMetrics() {
        return {
            hits: metrics.hits,
            misses: metrics.misses,
            hitRate: metrics.hitRate,
            connected: isRedisConnected(),
        };
    },
};
