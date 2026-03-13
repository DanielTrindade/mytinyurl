import { generateRandomCode, SHORT_CODE_LENGTH } from './random';

/**
 * Generates an opaque short code using a cryptographically secure
 * random source instead of a monotonic identifier.
 */
export function generateShortCode(): string {
    return generateRandomCode(SHORT_CODE_LENGTH);
}

/**
 * Legacy function kept for backward compatibility with tests and call sites.
 * @deprecated Use generateShortCode() directly
 */
export async function generateUniqueShortCode(
    _existsCheck?: (code: string) => Promise<boolean>,
): Promise<string> {
    return generateShortCode();
}
