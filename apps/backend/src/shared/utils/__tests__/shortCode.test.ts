import { describe, it, expect } from 'vitest';
import { generateShortCode } from '@shared/utils/shortCode';

describe('generateShortCode()', () => {
    it('should generate a code with default length of 6', () => {
        const code = generateShortCode();
        expect(code).toHaveLength(6);
    });

    it('should generate a code with custom length', () => {
        const code = generateShortCode({ length: 8 });
        expect(code).toHaveLength(8);
    });

    it('should generate a code with length 4', () => {
        const code = generateShortCode({ length: 4 });
        expect(code).toHaveLength(4);
    });

    it('should only contain alphanumeric characters', () => {
        const code = generateShortCode();
        expect(code).toMatch(/^[a-zA-Z0-9]+$/);
    });

    it('should exclude default confusing characters (0, O, I, l, 1)', () => {
        // Run multiple times to increase confidence
        for (let i = 0; i < 100; i++) {
            const code = generateShortCode();
            expect(code).not.toMatch(/[0OIl1]/);
        }
    });

    it('should exclude custom characters when provided', () => {
        for (let i = 0; i < 100; i++) {
            const code = generateShortCode({ excludeChars: ['a', 'b', 'c'] });
            // Custom excludeChars replaces defaults, so only 'a', 'b', 'c' are excluded
            expect(code).not.toMatch(/[abc]/);
        }
    });

    it('should generate different codes on each call', () => {
        const codes = new Set<string>();
        for (let i = 0; i < 50; i++) {
            codes.add(generateShortCode());
        }
        // With 57 possible chars and 6-char codes, collisions in 50 runs are nearly impossible
        expect(codes.size).toBeGreaterThan(45);
    });
});
