export class AppError extends Error {
    constructor(
        message: string,
        public statusCode: number = 500,
        public code: string = 'INTERNAL_ERROR'
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists') {
        super(message, 409, 'CONFLICT');
        this.name = 'ConflictError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string = 'Validation failed') {
        super(message, 422, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}

export class GoneError extends AppError {
    constructor(message: string = 'Resource has expired') {
        super(message, 410, 'GONE');
        this.name = 'GoneError';
    }
}

export interface ErrorResponse {
    error: string;
    message: string;
    statusCode: number;
}

export function isAppLikeError(error: unknown): error is AppError {
    return (
        error instanceof AppError ||
        (typeof error === 'object' &&
            error !== null &&
            'statusCode' in error &&
            typeof (error as { statusCode?: unknown }).statusCode === 'number' &&
            'code' in error &&
            typeof (error as { code?: unknown }).code === 'string' &&
            'message' in error &&
            typeof (error as { message?: unknown }).message === 'string')
    );
}

export function toErrorResponse(error: unknown): ErrorResponse {
    if (isAppLikeError(error)) {
        return {
            error: error.code,
            message: error.message,
            statusCode: error.statusCode,
        };
    }

    return {
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        statusCode: 500,
    };
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}

export class TooManyRequestsError extends AppError {
    constructor(message: string = 'Too many requests') {
        super(message, 429, 'TOO_MANY_REQUESTS');
        this.name = 'TooManyRequestsError';
    }
}
