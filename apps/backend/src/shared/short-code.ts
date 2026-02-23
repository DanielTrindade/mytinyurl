const BASE62_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DEFAULT_LENGTH = 6;
const MAX_RETRIES = 5;

/**
 * Generates a random short code using base62 characters.
 * Default length of 6 gives ~56 billion combinations (62^6).
 */
export function generateShortCode(length: number = DEFAULT_LENGTH): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    let result = '';

    for (let i = 0; i < length; i++) {
        result += BASE62_CHARS[bytes[i] % BASE62_CHARS.length];
    }

    return result;
}

/**
 * Generates a short code with retry logic for collision handling.
 * @param existsCheck - async function that returns true if code already exists
 */
export async function generateUniqueShortCode(
    existsCheck: (code: string) => Promise<boolean>,
    length: number = DEFAULT_LENGTH
): Promise<string> {
    for (let i = 0; i < MAX_RETRIES; i++) {
        const code = generateShortCode(length);
        const exists = await existsCheck(code);
        if (!exists) return code;
    }

    throw new Error(
        `Failed to generate unique short code after ${MAX_RETRIES} attempts`
    );
}
