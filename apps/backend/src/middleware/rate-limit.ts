import type { AppConfig } from '../config/types';
import { getRedisClient } from '../cache/connection';

export interface RateLimitRule {
    name: 'shorten' | 'stats' | 'redirect' | 'health';
    maxRequests: number;
    windowSeconds: number;
}

export interface RateLimitConsumption {
    count: number;
    retryAfterSeconds: number;
}

export interface RateLimitStore {
    consume(key: string, windowSeconds: number): Promise<RateLimitConsumption>;
}

export class InMemoryRateLimitStore implements RateLimitStore {
    private readonly counters = new Map<string, { count: number; resetAt: number }>();

    async consume(key: string, windowSeconds: number): Promise<RateLimitConsumption> {
        const now = Date.now();
        const current = this.counters.get(key);

        if (!current || current.resetAt <= now) {
            const resetAt = now + windowSeconds * 1000;
            this.counters.set(key, { count: 1, resetAt });

            return { count: 1, retryAfterSeconds: windowSeconds };
        }

        current.count += 1;
        return {
            count: current.count,
            retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
        };
    }
}

export class HybridRateLimitStore implements RateLimitStore {
    constructor(private readonly fallbackStore: RateLimitStore = new InMemoryRateLimitStore()) {}

    async consume(key: string, windowSeconds: number): Promise<RateLimitConsumption> {
        const client = getRedisClient();
        if (!client) return this.fallbackStore.consume(key, windowSeconds);

        try {
            const count = await client.incr(key);
            if (count === 1) {
                await client.expire(key, windowSeconds);
            }

            const ttl = await client.ttl(key);
            return {
                count,
                retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
            };
        } catch {
            return this.fallbackStore.consume(key, windowSeconds);
        }
    }
}

export function resolveRateLimitRule(
    method: string,
    path: string,
    config: AppConfig
): RateLimitRule | null {
    if (method === 'POST' && path === '/api/shorten') {
        return {
            name: 'shorten',
            maxRequests: config.RATE_LIMIT_MAX_SHORTEN,
            windowSeconds: config.RATE_LIMIT_WINDOW_SECONDS,
        };
    }

    if (method === 'GET' && path.startsWith('/api/urls/') && path.endsWith('/stats')) {
        return {
            name: 'stats',
            maxRequests: config.RATE_LIMIT_MAX_STATS,
            windowSeconds: config.RATE_LIMIT_WINDOW_SECONDS,
        };
    }

    if (method === 'GET' && path === '/health') {
        return {
            name: 'health',
            maxRequests: config.RATE_LIMIT_MAX_HEALTH,
            windowSeconds: config.RATE_LIMIT_WINDOW_SECONDS,
        };
    }

    if (method === 'GET' && /^\/[A-Za-z0-9]{6,10}$/.test(path)) {
        return {
            name: 'redirect',
            maxRequests: config.RATE_LIMIT_MAX_REDIRECT,
            windowSeconds: config.RATE_LIMIT_WINDOW_SECONDS,
        };
    }

    return null;
}

export function getClientIdentity(headers: Record<string, string | undefined>): string {
    const forwarded = headers['x-forwarded-for']?.split(',')[0]?.trim();
    const realIp = headers['x-real-ip']?.trim();
    const cloudflareIp = headers['cf-connecting-ip']?.trim();

    return forwarded || realIp || cloudflareIp || 'anonymous';
}
