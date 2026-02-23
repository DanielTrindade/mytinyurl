import { getRedisClient } from '../cache/connection';

/**
 * Event Producer — publishes visit events to a Redis Stream.
 *
 * Instead of directly incrementing visits in PostgreSQL on each redirect,
 * we publish lightweight events to a Redis Stream. A separate consumer
 * reads these events in batches and does a single aggregated UPDATE.
 *
 * Stream: "visits" (key in Redis)
 * Event fields: { shortCode, timestamp }
 *
 * Benefits:
 * - Redirect stays fast (< 2ms to publish)
 * - DB writes are batched (1 UPDATE per short code per batch)
 * - Decoupled: if consumer is down, events queue up safely
 */

const STREAM_KEY = 'stream:visits';

// Metrics
const producerMetrics = {
    published: 0,
    errors: 0,
};

export const eventProducer = {
    /**
     * Publish a visit event to the Redis Stream.
     * Fire-and-forget: errors are logged but don't break the redirect.
     */
    async publishVisit(shortCode: string): Promise<void> {
        const client = getRedisClient();
        if (!client) return;

        try {
            // XADD stream:visits * shortCode abc123 timestamp 1234567890
            await client.xadd(STREAM_KEY, '*', 'shortCode', shortCode, 'timestamp', Date.now().toString());
            producerMetrics.published++;
        } catch (err) {
            producerMetrics.errors++;
            console.error('Event publish error:', err);
        }
    },

    getMetrics() {
        return {
            published: producerMetrics.published,
            errors: producerMetrics.errors,
        };
    },

    /** Exposed for consumer module */
    STREAM_KEY,
};
