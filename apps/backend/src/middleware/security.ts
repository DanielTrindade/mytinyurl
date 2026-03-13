import { randomUUID } from 'node:crypto';
import { Elysia } from 'elysia';
import type { AppConfig } from '../config/types';
import {
    HybridRateLimitStore,
    type RateLimitStore,
    getClientIdentity,
    resolveRateLimitRule,
} from './rate-limit';

interface SecurityPluginOptions {
    config: AppConfig;
    rateLimitStore?: RateLimitStore;
}

function applySecurityHeaders(
    headers: Record<string, string>,
    forwardedProto?: string
) {
    headers['X-Content-Type-Options'] = 'nosniff';
    headers['X-Frame-Options'] = 'DENY';
    headers['Referrer-Policy'] = 'no-referrer';
    headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()';
    headers['Cache-Control'] = 'no-store';

    if (forwardedProto === 'https') {
        headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    }
}

export function createSecurityPlugin({ config, rateLimitStore }: SecurityPluginOptions) {
    const store = rateLimitStore || new HybridRateLimitStore();

    return new Elysia({ name: 'security-plugin' })
        .onRequest(async ({ request, set }) => {
            applySecurityHeaders(set.headers, request.headers.get('x-forwarded-proto') || undefined);
            set.headers['X-Request-Id'] = request.headers.get('x-request-id') || randomUUID();

            const contentLengthHeader = request.headers.get('content-length');
            if (contentLengthHeader) {
                const contentLength = Number(contentLengthHeader);
                if (
                    Number.isFinite(contentLength) &&
                    contentLength > config.MAX_REQUEST_BODY_BYTES
                ) {
                    set.status = 413;
                    return {
                        error: 'PAYLOAD_TOO_LARGE',
                        message: `Request body exceeds ${config.MAX_REQUEST_BODY_BYTES} bytes`,
                        statusCode: 413,
                    };
                }
            }

            const url = new URL(request.url);
            const rule = resolveRateLimitRule(request.method, url.pathname, config);
            if (!rule) return;

            const identity = getClientIdentity({
                'x-forwarded-for': request.headers.get('x-forwarded-for') || undefined,
                'x-real-ip': request.headers.get('x-real-ip') || undefined,
                'cf-connecting-ip': request.headers.get('cf-connecting-ip') || undefined,
            });
            const key = `rate-limit:${rule.name}:${identity}`;
            const result = await store.consume(key, rule.windowSeconds);

            set.headers['RateLimit-Limit'] = String(rule.maxRequests);
            set.headers['RateLimit-Remaining'] = String(
                Math.max(0, rule.maxRequests - result.count)
            );

            if (result.count <= rule.maxRequests) return;

            set.status = 429;
            set.headers['Retry-After'] = String(result.retryAfterSeconds);

            return {
                error: 'TOO_MANY_REQUESTS',
                message: `Rate limit exceeded for ${rule.name}`,
                statusCode: 429,
            };
        });
}
