import net from 'node:net';
import type { AppConfig } from '../config/types';
import { ValidationError } from './errors';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
const LOCAL_TLDS = ['.localhost', '.local', '.internal'];

function isPrivateIpv4(ip: string): boolean {
    const octets = ip.split('.').map(Number);
    if (octets.length !== 4 || octets.some((part) => Number.isNaN(part))) return true;

    const [a, b] = octets;

    return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
    );
}

function isPrivateIpv6(ip: string): boolean {
    const normalized = ip.toLowerCase();

    return (
        normalized === '::' ||
        normalized === '::1' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe8') ||
        normalized.startsWith('fe9') ||
        normalized.startsWith('fea') ||
        normalized.startsWith('feb')
    );
}

export function isPrivateHostname(hostname: string): boolean {
    const normalized = hostname.trim().toLowerCase().replace(/\.$/, '');

    if (!normalized) return true;
    if (LOCAL_HOSTNAMES.has(normalized)) return true;
    if (LOCAL_TLDS.some((suffix) => normalized.endsWith(suffix))) return true;

    const ipVersion = net.isIP(normalized);
    if (ipVersion === 4) return isPrivateIpv4(normalized);
    if (ipVersion === 6) return isPrivateIpv6(normalized);

    return false;
}

export interface DestinationUrlValidationOptions {
    allowPrivateTargets: AppConfig['BLOCK_PRIVATE_TARGETS'];
    maxLength: AppConfig['MAX_URL_LENGTH'];
}

export function validateDestinationUrl(
    value: string,
    options: DestinationUrlValidationOptions
): string {
    if (value.length > options.maxLength) {
        throw new ValidationError(`URL must be at most ${options.maxLength} characters long`);
    }

    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        throw new ValidationError('URL is invalid');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new ValidationError('Only http:// and https:// URLs are allowed');
    }

    if (parsed.username || parsed.password) {
        throw new ValidationError('URLs with embedded credentials are not allowed');
    }

    if (!options.allowPrivateTargets && isPrivateHostname(parsed.hostname)) {
        throw new ValidationError('Private, loopback, and local network targets are not allowed');
    }

    return parsed.toString();
}
