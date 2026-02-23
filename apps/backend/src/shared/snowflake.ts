/**
 * Snowflake ID Generator — Twitter-style distributed unique IDs.
 *
 * 64-bit structure:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ 1 bit unused │ 41 bits timestamp │ 10 bits machine │ 12 bits seq │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * - Timestamp: milliseconds since custom epoch (2024-01-01), ~69 years range
 * - Machine ID: 0-1023, identifies the server instance
 * - Sequence: 0-4095, IDs per millisecond per machine
 *
 * Properties:
 * - Unique across machines without coordination
 * - Roughly time-sorted (useful for DB index locality)
 * - ~4096 IDs per millisecond per machine
 * - Clock skew protection (throws on backwards clock)
 */

// Custom epoch: 2024-01-01 00:00:00 UTC
const EPOCH = 1704067200000n;

const MACHINE_BITS = 10n;
const SEQUENCE_BITS = 12n;

const MAX_MACHINE_ID = (1n << MACHINE_BITS) - 1n; // 1023
const MAX_SEQUENCE = (1n << SEQUENCE_BITS) - 1n;   // 4095

const MACHINE_SHIFT = SEQUENCE_BITS;               // 12
const TIMESTAMP_SHIFT = MACHINE_BITS + SEQUENCE_BITS; // 22

export class SnowflakeGenerator {
    private machineId: bigint;
    private sequence = 0n;
    private lastTimestamp = -1n;

    constructor(machineId: number) {
        const id = BigInt(machineId);

        if (id < 0n || id > MAX_MACHINE_ID) {
            throw new Error(`Machine ID must be between 0 and ${MAX_MACHINE_ID} (got ${machineId})`);
        }

        this.machineId = id;
    }

    /**
     * Generate the next unique Snowflake ID.
     */
    nextId(): bigint {
        let timestamp = BigInt(Date.now()) - EPOCH;

        // Clock skew protection
        if (timestamp < this.lastTimestamp) {
            throw new Error(
                `Clock moved backwards! Refusing to generate ID. ` +
                `Last: ${this.lastTimestamp}, Current: ${timestamp}`
            );
        }

        if (timestamp === this.lastTimestamp) {
            // Same millisecond: increment sequence
            this.sequence = (this.sequence + 1n) & MAX_SEQUENCE;

            if (this.sequence === 0n) {
                // Sequence exhausted for this millisecond — wait for next ms
                timestamp = this.waitNextMillis(this.lastTimestamp);
            }
        } else {
            // New millisecond: reset sequence
            this.sequence = 0n;
        }

        this.lastTimestamp = timestamp;

        return (
            (timestamp << TIMESTAMP_SHIFT) |
            (this.machineId << MACHINE_SHIFT) |
            this.sequence
        );
    }

    /**
     * Extract components from a Snowflake ID (for debugging).
     */
    static parse(id: bigint) {
        return {
            timestamp: Number((id >> TIMESTAMP_SHIFT) + EPOCH),
            machineId: Number((id >> MACHINE_SHIFT) & MAX_MACHINE_ID),
            sequence: Number(id & MAX_SEQUENCE),
            date: new Date(Number((id >> TIMESTAMP_SHIFT) + EPOCH)),
        };
    }

    private waitNextMillis(lastTs: bigint): bigint {
        let ts = BigInt(Date.now()) - EPOCH;
        while (ts <= lastTs) {
            ts = BigInt(Date.now()) - EPOCH;
        }
        return ts;
    }
}
