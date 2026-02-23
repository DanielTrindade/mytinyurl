import Redis from 'ioredis';
import { eq, sql } from 'drizzle-orm';
import { urls } from '../db/schema';
import { shardRouter } from '../db';
import { env } from '../config/env';
import { eventProducer } from './producer';

/**
 * Event Consumer — reads visit events from Redis Stream in batches.
 *
 * Uses XREADGROUP with a consumer group for:
 * - At-least-once delivery (events are ACKed after processing)
 * - Multiple consumers can share the load
 * - If consumer dies, unACKed events are re-delivered
 *
 * Batch processing flow:
 * 1. XREADGROUP reads up to BATCH_SIZE events
 * 2. Aggregate: { 'abc123': 47, 'xyz789': 12 }
 * 3. One UPDATE per short code on the correct shard
 * 4. XACK all processed events
 *
 * Example: 1000 visits to 50 different URLs → 50 UPDATEs instead of 1000
 */

const STREAM_KEY = eventProducer.STREAM_KEY;
const GROUP_NAME = 'analytics-workers';
const CONSUMER_NAME = `worker-${process.pid}`;
const BATCH_SIZE = 100;
const POLL_INTERVAL_MS = 5000; // 5 seconds

// Metrics
const consumerMetrics = {
    processed: 0,
    batches: 0,
    errors: 0,
};

/**
 * Ensure the consumer group exists (create if not).
 */
async function ensureConsumerGroup(redis: Redis) {
    try {
        // Create group starting from new events ('$') — existing events are ignored
        // Use '0' to process all existing events from the beginning
        await redis.xgroup('CREATE', STREAM_KEY, GROUP_NAME, '0', 'MKSTREAM');
        console.log(`📋 Consumer group '${GROUP_NAME}' created`);
    } catch (err: any) {
        if (err.message?.includes('BUSYGROUP')) {
            // Group already exists — fine
            console.log(`📋 Consumer group '${GROUP_NAME}' already exists`);
        } else {
            throw err;
        }
    }
}

/**
 * Read and process a batch of events.
 * Returns the number of events processed.
 */
async function processBatch(redis: Redis): Promise<number> {
    // XREADGROUP GROUP analytics-workers worker-123 COUNT 100 BLOCK 2000 STREAMS stream:visits >
    const results = await redis.xreadgroup(
        'GROUP', GROUP_NAME, CONSUMER_NAME,
        'COUNT', BATCH_SIZE,
        'BLOCK', 2000,
        'STREAMS', STREAM_KEY,
        '>' // Only new, undelivered events
    );

    if (!results || results.length === 0) return 0;

    const streamResult = results[0] as [string, [string, string[]][]];
    const messages = streamResult[1];
    if (messages.length === 0) return 0;

    // Aggregate: count visits per short code
    const visitCounts = new Map<string, number>();
    const messageIds: string[] = [];

    for (const [id, fields] of messages) {
        messageIds.push(id);

        // fields is [key1, val1, key2, val2, ...]
        const shortCode = fields[1]; // fields[0] = 'shortCode', fields[1] = value
        visitCounts.set(shortCode, (visitCounts.get(shortCode) || 0) + 1);
    }

    // Bulk UPDATE: one query per short code, on the correct shard
    for (const [shortCode, count] of visitCounts) {
        try {
            const db = shardRouter.getDb(shortCode);
            await db.update(urls)
                .set({
                    visits: sql`${urls.visits} + ${count}`,
                    updatedAt: new Date(),
                })
                .where(eq(urls.shortCode, shortCode));
        } catch (err) {
            console.error(`Failed to update visits for ${shortCode}:`, err);
            consumerMetrics.errors++;
        }
    }

    // ACK all processed events
    if (messageIds.length > 0) {
        await redis.xack(STREAM_KEY, GROUP_NAME, ...messageIds);
    }

    consumerMetrics.processed += messages.length;
    consumerMetrics.batches++;

    console.log(
        `📊 Batch ${consumerMetrics.batches}: ` +
        `${messages.length} events → ${visitCounts.size} URLs updated ` +
        `(total: ${consumerMetrics.processed})`
    );

    return messages.length;
}

/**
 * Start the consumer loop. Runs forever, polling for events.
 */
export async function startConsumer() {
    if (!env.REDIS_URL) {
        console.error('❌ REDIS_URL not set. Cannot start consumer.');
        process.exit(1);
    }

    // Use a dedicated Redis connection for the consumer (blocking reads)
    const redis = new Redis(env.REDIS_URL);

    console.log('🚀 Analytics consumer starting...');
    await ensureConsumerGroup(redis);

    console.log(`👂 Listening for events on '${STREAM_KEY}' (batch: ${BATCH_SIZE}, poll: ${POLL_INTERVAL_MS}ms)`);

    // Main loop
    while (true) {
        try {
            const count = await processBatch(redis);

            // If no events, wait before next poll
            if (count === 0) {
                await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
            }
            // If we got a full batch, immediately read again (more events likely waiting)
        } catch (err) {
            console.error('Consumer error:', err);
            consumerMetrics.errors++;
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        }
    }
}

export function getConsumerMetrics() {
    return consumerMetrics;
}
