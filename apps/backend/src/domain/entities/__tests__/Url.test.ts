import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Url } from '@domain/entities/Url';

describe('Url Entity', () => {
    describe('create()', () => {
        it('should create a new URL with correct defaults', () => {
            const url = Url.create('https://example.com', 'abc123');

            expect(url.getId()).toBeDefined();
            expect(url.getOriginalUrl()).toBe('https://example.com');
            expect(url.getShortCode()).toBe('abc123');
            expect(url.getVisits()).toBe(0);
            expect(url.isActive()).toBe(true);
            expect(url.getCreatedAt()).toBeInstanceOf(Date);
            expect(url.getUpdatedAt()).toBeInstanceOf(Date);
        });

        it('should create a URL with expiration date', () => {
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
            const url = Url.create('https://example.com', 'abc123', expiresAt);

            expect(url.getExpiresAt()).toEqual(expiresAt);
        });

        it('should create a URL without expiration date', () => {
            const url = Url.create('https://example.com', 'abc123');

            expect(url.getExpiresAt()).toBeUndefined();
        });

        it('should generate a unique UUID as id', () => {
            const url1 = Url.create('https://example.com', 'abc123');
            const url2 = Url.create('https://example.com', 'def456');

            expect(url1.getId()).not.toBe(url2.getId());
        });
    });

    describe('reconstruct()', () => {
        it('should reconstruct a URL from stored properties', () => {
            const props = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                originalUrl: 'https://example.com',
                shortCode: 'abc123',
                visits: 42,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-06-01'),
                expiresAt: new Date('2025-01-01'),
                isActive: true,
            };

            const url = Url.reconstruct(props);

            expect(url.getId()).toBe(props.id);
            expect(url.getOriginalUrl()).toBe(props.originalUrl);
            expect(url.getShortCode()).toBe(props.shortCode);
            expect(url.getVisits()).toBe(42);
            expect(url.getCreatedAt()).toEqual(props.createdAt);
            expect(url.getUpdatedAt()).toEqual(props.updatedAt);
            expect(url.getExpiresAt()).toEqual(props.expiresAt);
            expect(url.isActive()).toBe(true);
        });

        it('should reconstruct a deactivated URL', () => {
            const url = Url.reconstruct({
                id: '1',
                originalUrl: 'https://example.com',
                shortCode: 'abc',
                visits: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: false,
            });

            expect(url.isActive()).toBe(false);
        });
    });

    describe('incrementVisits()', () => {
        it('should increment visit counter by 1', () => {
            const url = Url.create('https://example.com', 'abc123');

            expect(url.getVisits()).toBe(0);
            url.incrementVisits();
            expect(url.getVisits()).toBe(1);
            url.incrementVisits();
            expect(url.getVisits()).toBe(2);
        });

        it('should update updatedAt timestamp', () => {
            const url = Url.create('https://example.com', 'abc123');
            const beforeUpdate = url.getUpdatedAt();

            // Small delay to ensure different timestamp
            vi.useFakeTimers();
            vi.advanceTimersByTime(1000);
            url.incrementVisits();
            vi.useRealTimers();

            expect(url.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
        });
    });

    describe('deactivate()', () => {
        it('should set active to false', () => {
            const url = Url.create('https://example.com', 'abc123');

            expect(url.isActive()).toBe(true);
            url.deactivate();
            expect(url.isActive()).toBe(false);
        });

        it('should update updatedAt timestamp', () => {
            const url = Url.create('https://example.com', 'abc123');
            const beforeUpdate = url.getUpdatedAt();

            vi.useFakeTimers();
            vi.advanceTimersByTime(1000);
            url.deactivate();
            vi.useRealTimers();

            expect(url.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
        });
    });

    describe('isValidForRedirect()', () => {
        it('should return true for active URL without expiration', () => {
            const url = Url.create('https://example.com', 'abc123');
            expect(url.isValidForRedirect()).toBe(true);
        });

        it('should return true for active URL with future expiration', () => {
            const future = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
            const url = Url.create('https://example.com', 'abc123', future);
            expect(url.isValidForRedirect()).toBe(true);
        });

        it('should return false for expired URL', () => {
            const past = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
            const url = Url.create('https://example.com', 'abc123', past);
            expect(url.isValidForRedirect()).toBe(false);
        });

        it('should return false for deactivated URL', () => {
            const url = Url.create('https://example.com', 'abc123');
            url.deactivate();
            expect(url.isValidForRedirect()).toBe(false);
        });

        it('should return false for deactivated URL even with valid expiration', () => {
            const future = new Date(Date.now() + 60 * 60 * 1000);
            const url = Url.create('https://example.com', 'abc123', future);
            url.deactivate();
            expect(url.isValidForRedirect()).toBe(false);
        });
    });
});
