/**
 * Base62 encoder/decoder.
 *
 * Converts bigints to/from compact, URL-safe strings.
 * Used to encode Snowflake IDs into short codes like 'dGh7Kp2'.
 *
 * Character set: a-z A-Z 0-9 (62 chars)
 * A 64-bit number encodes to ~11 chars max, but typical Snowflake IDs
 * produce 7-8 char codes.
 */

const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const BASE = BigInt(CHARS.length); // 62n

/**
 * Encode a bigint to a base62 string.
 */
export function base62Encode(num: bigint): string {
    if (num === 0n) return CHARS[0];

    let result = '';
    let n = num;

    while (n > 0n) {
        result = CHARS[Number(n % BASE)] + result;
        n = n / BASE;
    }

    return result;
}

/**
 * Decode a base62 string back to a bigint.
 */
export function base62Decode(str: string): bigint {
    let result = 0n;

    for (const char of str) {
        const index = CHARS.indexOf(char);
        if (index === -1) throw new Error(`Invalid base62 character: '${char}'`);
        result = result * BASE + BigInt(index);
    }

    return result;
}
