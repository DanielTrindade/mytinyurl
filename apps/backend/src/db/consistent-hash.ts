import * as crypto from 'crypto';

/**
 * Consistent Hashing Ring with Virtual Nodes.
 *
 * Why consistent hashing instead of simple `hash % N`?
 * - Simple hash: adding 1 shard moves ~66% of data
 * - Consistent hash: adding 1 shard moves only ~33% of data
 *
 * Virtual nodes improve distribution uniformity. Each physical shard
 * gets 150 positions on the ring, preventing hotspots.
 *
 * ```
 *        ┌──── Shard 1 (v-node 3) ────┐
 *        │                              │
 *   Shard 2 (v-node 7)            Shard 1 (v-node 1)
 *        │                              │
 *        │    key("abc") → lands here   │
 *        │         ↓                    │
 *   Shard 2 (v-node 2)            Shard 2 (v-node 5)
 *        │                              │
 *        └──── Shard 1 (v-node 6) ────┘
 * ```
 */

const VIRTUAL_NODES_PER_SHARD = 150;

interface RingNode {
    hash: number;
    shardIndex: number;
}

export class ConsistentHashRing {
    private ring: RingNode[] = [];
    private shardCount: number;

    constructor(shardCount: number) {
        this.shardCount = shardCount;
        this.buildRing();
    }

    /**
     * Get the shard index for a given key (e.g., shortCode).
     */
    getShard(key: string): number {
        const hash = this.hash(key);

        // Binary search for the first node with hash >= key hash
        let lo = 0;
        let hi = this.ring.length - 1;

        // If hash is greater than all nodes, wrap around to first node
        if (hash > this.ring[hi].hash) {
            return this.ring[0].shardIndex;
        }

        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (this.ring[mid].hash < hash) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }

        return this.ring[lo].shardIndex;
    }

    /**
     * Get distribution stats (for debugging/monitoring).
     */
    getDistribution(keys: string[]): Record<number, number> {
        const dist: Record<number, number> = {};
        for (let i = 0; i < this.shardCount; i++) dist[i] = 0;

        for (const key of keys) {
            dist[this.getShard(key)]++;
        }

        return dist;
    }

    private buildRing() {
        this.ring = [];

        for (let shard = 0; shard < this.shardCount; shard++) {
            for (let vn = 0; vn < VIRTUAL_NODES_PER_SHARD; vn++) {
                const key = `shard-${shard}-vnode-${vn}`;
                this.ring.push({
                    hash: this.hash(key),
                    shardIndex: shard,
                });
            }
        }

        // Sort ring by hash for binary search
        this.ring.sort((a, b) => a.hash - b.hash);
    }

    private hash(key: string): number {
        const md5 = crypto.createHash('md5').update(key).digest();
        // Use first 4 bytes as unsigned 32-bit integer
        return md5.readUInt32BE(0);
    }
}
