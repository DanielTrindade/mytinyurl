import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { AppError } from '@shared/errors/AppError';

describe('AppError', () => {
    it('should create an error with default status code 400', () => {
        const error = new AppError('Bad request');

        expect(error.message).toBe('Bad request');
        expect(error.statusCode).toBe(400);
        expect(error.name).toBe('AppError');
        expect(error).toBeInstanceOf(Error);
    });

    it('should create an error with custom status code', () => {
        const error = new AppError('Not found', 404);

        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('Not found');
    });

    it('should be distinguishable from regular Error', () => {
        const appError = new AppError('test');
        const regularError = new Error('test');

        expect(appError).toBeInstanceOf(AppError);
        expect(regularError).not.toBeInstanceOf(AppError);
    });
});

describe('Error handling behavior', () => {
    it('should have ZodError be a separate instance from AppError', () => {
        const zodError = new ZodError([]);
        expect(zodError).not.toBeInstanceOf(AppError);
        expect(zodError).toBeInstanceOf(ZodError);
    });
});
