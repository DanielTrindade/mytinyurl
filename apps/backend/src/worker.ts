/**
 * Analytics Worker — separate process that consumes visit events.
 *
 * Run this alongside the main API server:
 *   bun run src/worker.ts
 *
 * It reads visit events from Redis Streams in batches,
 * aggregates them, and does bulk UPDATEs on the correct shards.
 */

import { startConsumer } from './events/consumer';

console.log('┌─────────────────────────────────────┐');
console.log('│  📊 MyTinyURL Analytics Worker      │');
console.log('└─────────────────────────────────────┘');

startConsumer().catch((err) => {
    console.error('Fatal consumer error:', err);
    process.exit(1);
});
