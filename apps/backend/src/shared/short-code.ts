/**
 * Short code generator using Snowflake IDs + base62 encoding.
 *
 * Before (Etapa 00): Random base62 with DB collision check
 * After  (Etapa 02): Snowflake ID → base62 (guaranteed unique, no DB check)
 *
 * A Snowflake ID (64-bit) encodes to a 7-8 char base62 string.
 * Example: 123456789012345n → "dGh7Kp2"
 */

import { SnowflakeGenerator } from './snowflake';
import { base62Encode } from './base62';
import { env } from '../config/env';

// Singleton: one generator per server instance
const snowflake = new SnowflakeGenerator(env.MACHINE_ID);

/**
 * Generates a unique short code using Snowflake ID + base62.
 * No DB collision check needed — uniqueness is guaranteed by
 * the Snowflake algorithm (timestamp + machineId + sequence).
 */
export function generateShortCode(): string {
    const id = snowflake.nextId();
    return base62Encode(id);
}

/**
 * Legacy function kept for backward compatibility with tests.
 * With Snowflake IDs, collision check is unnecessary.
 * @deprecated Use generateShortCode() directly
 */
export async function generateUniqueShortCode(
    _existsCheck?: (code: string) => Promise<boolean>,
): Promise<string> {
    return generateShortCode();
}
