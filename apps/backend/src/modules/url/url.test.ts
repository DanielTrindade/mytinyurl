import { describe, test, expect } from 'bun:test';
import { generateShortCode } from '../../shared/short-code';
import { base62Encode, base62Decode } from '../../shared/base62';
import { SnowflakeGenerator } from '../../shared/snowflake';

describe('base62', () => {
    test('encodes and decodes correctly (roundtrip)', () => {
        const values = [0n, 1n, 61n, 62n, 100n, 123456789n, 9007199254740991n];

        for (const val of values) {
            const encoded = base62Encode(val);
            const decoded = base62Decode(encoded);
            expect(decoded).toBe(val);
        }
    });

    test('produces URL-safe characters only', () => {
        const base62Regex = /^[a-zA-Z0-9]+$/;
        for (let i = 0n; i < 100n; i++) {
            expect(base62Encode(i * 1000000n)).toMatch(base62Regex);
        }
    });

    test('throws on invalid character', () => {
        expect(() => base62Decode('abc-def')).toThrow('Invalid base62 character');
    });
});

describe('SnowflakeGenerator', () => {
    test('generates unique IDs', () => {
        const gen = new SnowflakeGenerator(1);
        const ids = new Set<bigint>();

        for (let i = 0; i < 1000; i++) {
            ids.add(gen.nextId());
        }

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
        const gen1 = new SnowflakeGenerator(1);
        const gen2 = new SnowflakeGenerator(2);

        const id1 = gen1.nextId();
        const id2 = gen2.nextId();

        expect(id1).not.toBe(id2);
    });

    test('rejects invalid machine IDs', () => {
        expect(() => new SnowflakeGenerator(-1)).toThrow();
        expect(() => new SnowflakeGenerator(1024)).toThrow();
    });

    test('parse extracts correct components', () => {
        const gen = new SnowflakeGenerator(42);
        const id = gen.nextId();
        const parsed = SnowflakeGenerator.parse(id);

        expect(parsed.machineId).toBe(42);
        expect(parsed.sequence).toBe(0);
        expect(parsed.date).toBeInstanceOf(Date);
        expect(parsed.date.getFullYear()).toBe(new Date().getFullYear());
    });
});

describe('generateShortCode (Snowflake + base62)', () => {
    test('produces a non-empty string', () => {
        const code = generateShortCode();
        expect(code.length).toBeGreaterThan(0);
    });

    test('produces unique codes', () => {
        const codes = new Set<string>();
        for (let i = 0; i < 1000; i++) {
            codes.add(generateShortCode());
        }
        expect(codes.size).toBe(1000);
    });

    test('only contains base62 characters', () => {
        const base62Regex = /^[a-zA-Z0-9]+$/;
        for (let i = 0; i < 100; i++) {
            expect(generateShortCode()).toMatch(base62Regex);
        }
    });

    test('codes are typically 7-8 characters', () => {
        const code = generateShortCode();
        expect(code.length).toBeGreaterThanOrEqual(6);
        expect(code.length).toBeLessThanOrEqual(12);
    });
});
