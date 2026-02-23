import { describe, test, expect } from 'bun:test';
import { generateShortCode, generateUniqueShortCode } from '../../shared/short-code';

describe('generateShortCode', () => {
    test('generates a code with default length of 6', () => {
        const code = generateShortCode();
        expect(code).toHaveLength(6);
    });

    test('generates a code with custom length', () => {
        const code = generateShortCode(8);
        expect(code).toHaveLength(8);
    });

    test('only contains base62 characters', () => {
        const base62Regex = /^[a-zA-Z0-9]+$/;
        for (let i = 0; i < 100; i++) {
            const code = generateShortCode();
            expect(code).toMatch(base62Regex);
        }
    });

    test('generates unique codes', () => {
        const codes = new Set<string>();
        for (let i = 0; i < 1000; i++) {
            codes.add(generateShortCode());
        }
        // With 62^6 combinations, 1000 codes should all be unique
        expect(codes.size).toBe(1000);
    });
});

describe('generateUniqueShortCode', () => {
    test('returns a code when no collision', async () => {
        const code = await generateUniqueShortCode(async () => false);
        expect(code).toHaveLength(6);
    });

    test('retries on collision and succeeds', async () => {
        let attempts = 0;
        const code = await generateUniqueShortCode(async () => {
            attempts++;
            return attempts < 3; // Collide first 2 times, succeed on 3rd
        });
        expect(code).toHaveLength(6);
        expect(attempts).toBe(3);
    });

    test('throws after max retries', async () => {
        expect(
            generateUniqueShortCode(async () => true) // Always "exists"
        ).rejects.toThrow('Failed to generate unique short code');
    });
});
