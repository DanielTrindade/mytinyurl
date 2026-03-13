import { randomInt, randomUUID } from 'node:crypto';

const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const DEFAULT_SHORT_CODE_LENGTH = 8;

export function generateRandomCode(length: number = DEFAULT_SHORT_CODE_LENGTH): string {
    let code = '';

    for (let i = 0; i < length; i++) {
        code += BASE62_ALPHABET[randomInt(0, BASE62_ALPHABET.length)];
    }

    return code;
}

export function generateOpaqueToken(): string {
    return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
}

export const SHORT_CODE_LENGTH = DEFAULT_SHORT_CODE_LENGTH;
