import { describe, expect, test } from 'bun:test';
import { ValidationError } from './errors';
import { isPrivateHostname, validateDestinationUrl } from './url-safety';

const baseOptions = {
    allowPrivateTargets: false,
    maxLength: 2048,
};

describe('validateDestinationUrl', () => {
    test('accepts public https URLs', () => {
        expect(
            validateDestinationUrl('https://example.com/path?q=1', baseOptions)
        ).toBe('https://example.com/path?q=1');
    });

    test('rejects non-http schemes', () => {
        expect(() =>
            validateDestinationUrl('javascript:alert(1)', baseOptions)
        ).toThrow(ValidationError);
    });

    test('rejects embedded credentials', () => {
        expect(() =>
            validateDestinationUrl('https://user:pass@example.com', baseOptions)
        ).toThrow('embedded credentials');
    });

    test('rejects localhost and private IPv4 addresses', () => {
        expect(() =>
            validateDestinationUrl('http://localhost:3000', baseOptions)
        ).toThrow('Private, loopback');

        expect(() =>
            validateDestinationUrl('http://192.168.0.12/admin', baseOptions)
        ).toThrow('Private, loopback');
    });

    test('rejects overly long URLs', () => {
        const tooLong = `https://example.com/${'a'.repeat(2050)}`;
        expect(() => validateDestinationUrl(tooLong, baseOptions)).toThrow('at most');
    });

    test('can allow private targets when explicitly configured', () => {
        expect(
            validateDestinationUrl('http://127.0.0.1/internal', {
                ...baseOptions,
                allowPrivateTargets: true,
            })
        ).toBe('http://127.0.0.1/internal');
    });
});

describe('isPrivateHostname', () => {
    test('detects local hostnames', () => {
        expect(isPrivateHostname('localhost')).toBe(true);
        expect(isPrivateHostname('devbox.local')).toBe(true);
    });

    test('does not flag public domains', () => {
        expect(isPrivateHostname('example.com')).toBe(false);
    });
});
