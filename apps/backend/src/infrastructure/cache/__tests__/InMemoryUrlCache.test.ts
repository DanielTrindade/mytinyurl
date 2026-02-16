import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUrlCache } from '@infrastructure/cache/InMemoryUrlCache';

describe('InMemoryUrlCache', () => {
    let cache: InMemoryUrlCache;

    beforeEach(() => {
        cache = new InMemoryUrlCache({ maxEntries: 5, ttlMs: 1000 });
    });

    it('should store and retrieve a value', () => {
        cache.set('abc', 'https://example.com');
        expect(cache.get('abc')).toBe('https://example.com');
    });

    it('should return null for missing keys', () => {
        expect(cache.get('nope')).toBeNull();
    });

    it('should return null for expired entries', async () => {
        const shortCache = new InMemoryUrlCache({ ttlMs: 50 });
        shortCache.set('abc', 'https://example.com');

        expect(shortCache.get('abc')).toBe('https://example.com');

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(shortCache.get('abc')).toBeNull();
    });

    it('should invalidate a specific key', () => {
        cache.set('abc', 'https://example.com');
        cache.set('def', 'https://other.com');

        cache.invalidate('abc');

        expect(cache.get('abc')).toBeNull();
        expect(cache.get('def')).toBe('https://other.com');
    });

    it('should clear all entries', () => {
        cache.set('abc', 'https://example.com');
        cache.set('def', 'https://other.com');

        cache.clear();

        expect(cache.size).toBe(0);
        expect(cache.get('abc')).toBeNull();
        expect(cache.get('def')).toBeNull();
    });

    it('should evict oldest entry when exceeding maxEntries', () => {
        cache.set('a', 'url-a');
        cache.set('b', 'url-b');
        cache.set('c', 'url-c');
        cache.set('d', 'url-d');
        cache.set('e', 'url-e');

        expect(cache.size).toBe(5);

        // Adding 6th entry should evict 'a' (oldest)
        cache.set('f', 'url-f');

        expect(cache.size).toBe(5);
        expect(cache.get('a')).toBeNull();
        expect(cache.get('f')).toBe('url-f');
    });

    it('should track size correctly', () => {
        expect(cache.size).toBe(0);
        cache.set('abc', 'https://example.com');
        expect(cache.size).toBe(1);
        cache.set('def', 'https://other.com');
        expect(cache.size).toBe(2);
        cache.invalidate('abc');
        expect(cache.size).toBe(1);
    });

    it('should overwrite existing key without increasing size', () => {
        cache.set('abc', 'https://old.com');
        cache.set('abc', 'https://new.com');

        expect(cache.size).toBe(1);
        expect(cache.get('abc')).toBe('https://new.com');
    });
});
