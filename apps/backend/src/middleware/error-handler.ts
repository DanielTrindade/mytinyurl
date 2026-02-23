import { Elysia } from 'elysia';
import { AppError } from '../shared/errors';

/**
 * Global error handler plugin for Elysia.
 * Catches AppError instances and formats consistent error responses.
 */
export const errorHandler = new Elysia({ name: 'error-handler' }).onError(
    ({ error, set }) => {
        if (error instanceof AppError) {
            set.status = error.statusCode;
            return {
                error: error.code,
                message: error.message,
                statusCode: error.statusCode,
            };
        }

        // Elysia built-in validation errors
        if ('name' in error && error.name === 'ValidationError') {
            set.status = 422;
            return {
                error: 'VALIDATION_ERROR',
                message: 'Invalid request data',
                statusCode: 422,
            };
        }

        // Unexpected errors
        console.error('Unhandled error:', error);
        set.status = 500;
        return {
            error: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            statusCode: 500,
        };
    }
);
