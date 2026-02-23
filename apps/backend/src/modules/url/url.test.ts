import { describe, test, expect } from 'bun:test';
import { generateShortCode } from '../../shared/short-code';
import { base62Encode, base62Decode } from '../../shared/base62';
import { SnowflakeGenerator } from '../../shared/snowflake';
import { ConsistentHashRing } from '../../db/consistent-hash';

// ── Base62 ──

describe('base62', () => {
    test('encodes and decodes correctly (roundtrip)', () => {
        const values = [0n, 1n, 61n, 62n, 100n, 123456789n, 9007199254740991n];
        for (const val of values) {
            expect(base62Decode(base62Encode(val))).toBe(val);
        }
    });

    test('produces URL-safe characters only', () => {
        const regex = /^[a-zA-Z0-9]+$/;
        for (let i = 0n; i < 100n; i++) {
            expect(base62Encode(i * 1000000n)).toMatch(regex);
        }
    });

    test('throws on invalid character', () => {
        expect(() => base62Decode('abc-def')).toThrow('Invalid base62 character');
    });
});

// ── Snowflake ──

describe('SnowflakeGenerator', () => {
    test('generates 1000 unique IDs', () => {
        const gen = new SnowflakeGenerator(1);
        const ids = new Set<bigint>();
        for (let i = 0; i < 1000; i++) ids.add(gen.nextId());
        expect(ids.size).toBe(1000);
    });

    test('IDs are monotonically increasing', () => {
        const gen = new SnowflakeGenerator(1);
        let prev = 0n;
        for (let i = 0; i < 100; i++) {
            const id = gen.nextId();
            expect(id).toBeGreaterThan(prev);
            prev = id;
        }
    });

    test('different machines produce different IDs', () => {
        const g1 = new SnowflakeGenerator(1);
        const g2 = new SnowflakeGenerator(2);
        expect(g1.nextId()).not.toBe(g2.nextId());
    });

    test('rejects invalid machine IDs', () => {
        expect(() => new SnowflakeGenerator(-1)).toThrow();
        expect(() => new SnowflakeGenerator(1024)).toThrow();
    });

    test('parse extracts correct machine ID', () => {
        const gen = new SnowflakeGenerator(42);
        const parsed = SnowflakeGenerator.parse(gen.nextId());
        expect(parsed.machineId).toBe(42);
        expect(parsed.date.getFullYear()).toBe(new Date().getFullYear());
    });
});

// ── Consistent Hash Ring ──

describe('ConsistentHashRing', () => {
    test('same key always maps to same shard', () => {
        const ring = new ConsistentHashRing(3);
        const shard = ring.getShard('testKey');

        for (let i = 0; i < 100; i++) {
            expect(ring.getShard('testKey')).toBe(shard);
        }
    });

    test('distributes keys roughly evenly across shards', () => {
        const ring = new ConsistentHashRing(3);
        const keys = Array.from({ length: 10000 }, (_, i) => `key-${i}`);
        const dist = ring.getDistribution(keys);

        // Each shard should get between 20% and 45% of keys (rough balance)
        for (let i = 0; i < 3; i++) {
            expect(dist[i]).toBeGreaterThan(2000); // > 20%
            expect(dist[i]).toBeLessThan(4500);    // < 45%
        }
    });

    test('adding a shard moves minimal keys (consistent hashing property)', () => {
        const ring2 = new ConsistentHashRing(2);
        const ring3 = new ConsistentHashRing(3);

        const keys = Array.from({ length: 1000 }, (_, i) => `url-${i}`);

        let moved = 0;
        for (const key of keys) {
            if (ring2.getShard(key) !== ring3.getShard(key)) {
                moved++;
            }
        }

        // With consistent hashing, adding 1 shard to 2 should move ~33% of keys
        // Allow range 20-50% for practical variation
        const movedPct = (moved / keys.length) * 100;
        expect(movedPct).toBeGreaterThan(20);
        expect(movedPct).toBeLessThan(50);
    });

    test('all shard indices are valid', () => {
        const ring = new ConsistentHashRing(5);
        for (let i = 0; i < 1000; i++) {
            const shard = ring.getShard(`random-key-${i}`);
            expect(shard).toBeGreaterThanOrEqual(0);
            expect(shard).toBeLessThan(5);
        }
    });
});

// ── Short Code (integration) ──

describe('generateShortCode (Snowflake + base62)', () => {
    test('produces unique codes', () => {
        const codes = new Set<string>();
        for (let i = 0; i < 1000; i++) codes.add(generateShortCode());
        expect(codes.size).toBe(1000);
    });

    test('only contains base62 characters', () => {
        const regex = /^[a-zA-Z0-9]+$/;
        for (let i = 0; i < 100; i++) {
            expect(generateShortCode()).toMatch(regex);
        }
    });
});
