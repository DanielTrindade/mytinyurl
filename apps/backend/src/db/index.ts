import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { ConsistentHashRing } from './consistent-hash';
import { env } from '../config/env';

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Shard Router — directs queries to the correct PostgreSQL shard.
 *
 * Uses consistent hashing to determine which shard stores each URL.
 * Each shard is a separate PostgreSQL instance with its own Drizzle client.
 *
 * Flow:
 * 1. shortCode "abc123" → consistent hash → shard index 0
 * 2. ShardRouter.getDb("abc123") → returns Drizzle client for shard 0
 * 3. Query executes on the correct PostgreSQL instance
 */
export class ShardRouter {
    private shards: DrizzleDB[] = [];
    private hashRing: ConsistentHashRing;

    constructor(databaseUrls: string[]) {
        if (databaseUrls.length === 0) {
            throw new Error('At least one database URL is required');
        }

        this.hashRing = new ConsistentHashRing(databaseUrls.length);

        for (const url of databaseUrls) {
            const client = postgres(url);
            this.shards.push(drizzle(client, { schema }));
        }

        console.log(`🗄️  Shard Router initialized with ${this.shards.length} shard(s)`);
    }

    /**
     * Get the Drizzle DB instance for a given short code.
     */
    getDb(shortCode: string): DrizzleDB {
        const shardIndex = this.hashRing.getShard(shortCode);
        return this.shards[shardIndex];
    }

    /**
     * Get shard index for a given short code (for logging/monitoring).
     */
    getShardIndex(shortCode: string): number {
        return this.hashRing.getShard(shortCode);
    }

    /**
     * Get all shard DB instances (for migrations, health checks, etc.).
     */
    getAllShards(): DrizzleDB[] {
        return this.shards;
    }

    /**
     * Number of shards.
     */
    get shardCount(): number {
        return this.shards.length;
    }
}

// Initialize router from env
const databaseUrls = env.DATABASE_URLS;
export const shardRouter = new ShardRouter(databaseUrls);

// Backward compatibility: default db points to first shard
export const db = shardRouter.getDb('default');
