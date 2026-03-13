import { Elysia, t } from 'elysia';
import type { AppConfig } from '../../config/types';
import { toErrorResponse, UnauthorizedError } from '../../shared/errors';

export interface UrlRoutesService {
    createShortUrl(originalUrl: string): Promise<{
        id: string;
        originalUrl: string;
        shortCode: string;
        statsToken: string;
        expiresAt: Date | null;
        createdAt: Date;
    }>;
    getUrlStats(shortCode: string, statsToken: string): Promise<{
        id: string;
        originalUrl: string;
        shortCode: string;
        visits: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        statsToken: string;
    }>;
    redirectUrl(shortCode: string): Promise<string>;
}

interface UrlRoutesOptions {
    config: AppConfig;
    urlService: UrlRoutesService;
    getAdminHealth?: () => Record<string, unknown>;
}

const shortCodeSchema = t.String({
    pattern: '^[A-Za-z0-9]{6,10}$',
    maxLength: 10,
});

export function createUrlRoutes({
    config,
    urlService,
    getAdminHealth,
}: UrlRoutesOptions) {
    const api = new Elysia({ prefix: '/api' })
        .post(
            '/shorten',
            async ({ body, set }) => {
                try {
                    const url = await urlService.createShortUrl(body.url);

                    return {
                        id: url.id,
                        originalUrl: url.originalUrl,
                        shortCode: url.shortCode,
                        shortUrl: `${config.APP_URL}/${url.shortCode}`,
                        statsToken: url.statsToken,
                        expiresAt: url.expiresAt,
                        createdAt: url.createdAt,
                    };
                } catch (error) {
                    const response = toErrorResponse(error);
                    set.status = response.statusCode;
                    return response;
                }
            },
            {
                body: t.Object({
                    url: t.String({
                        format: 'uri',
                        maxLength: config.MAX_URL_LENGTH,
                    }),
                }),
                detail: {
                    tags: ['URLs'],
                    summary: 'Create a short URL',
                    description:
                        'Creates a new shortened URL and returns a stats token for private analytics access',
                },
            }
        )
        .get(
            '/urls/:shortCode/stats',
            async ({ params, query, request, set }) => {
                const statsToken = request.headers.get('x-stats-token') || query.token || '';
                if (!statsToken) {
                    const response = toErrorResponse(
                        new UnauthorizedError('Stats token is required')
                    );
                    set.status = response.statusCode;
                    return response;
                }

                try {
                    const url = await urlService.getUrlStats(params.shortCode, statsToken);

                    return {
                        id: url.id,
                        originalUrl: url.originalUrl,
                        shortCode: url.shortCode,
                        shortUrl: `${config.APP_URL}/${url.shortCode}`,
                        visits: url.visits,
                        isActive: url.isActive,
                        createdAt: url.createdAt,
                        updatedAt: url.updatedAt,
                        expiresAt: url.expiresAt,
                    };
                } catch (error) {
                    const response = toErrorResponse(error);
                    set.status = response.statusCode;
                    return response;
                }
            },
            {
                params: t.Object({
                    shortCode: shortCodeSchema,
                }),
                query: t.Object({
                    token: t.Optional(t.String({ minLength: 16, maxLength: 128 })),
                }),
                detail: {
                    tags: ['URLs'],
                    summary: 'Get URL statistics',
                    description:
                        'Returns statistics for a shortened URL when a valid stats token is provided',
                },
            }
        );

    if (getAdminHealth) {
        api.get(
            '/admin/health',
            ({ request, set }) => {
                if (
                    config.ADMIN_TOKEN &&
                    request.headers.get('x-admin-token') !== config.ADMIN_TOKEN
                ) {
                    const response = toErrorResponse(
                        new UnauthorizedError('Admin token is required')
                    );
                    set.status = response.statusCode;
                    return response;
                }

                return getAdminHealth();
            },
            {
                detail: {
                    tags: ['System'],
                    summary: 'Detailed health check',
                    description: 'Returns internal metrics and requires an admin token in production',
                },
            }
        );
    }

    return api;
}

export function createRedirectRoutes(urlService: UrlRoutesService) {
    return new Elysia().get(
        '/:shortCode',
        async ({ params, redirect, set }) => {
            try {
                const originalUrl = await urlService.redirectUrl(params.shortCode);
                return redirect(originalUrl, 302);
            } catch (error) {
                const response = toErrorResponse(error);
                set.status = response.statusCode;
                return response;
            }
        },
        {
            params: t.Object({
                shortCode: shortCodeSchema,
            }),
            detail: {
                tags: ['Redirect'],
                summary: 'Redirect to original URL',
                description: 'Redirects to the original URL and increments visit count',
            },
        }
    );
}
