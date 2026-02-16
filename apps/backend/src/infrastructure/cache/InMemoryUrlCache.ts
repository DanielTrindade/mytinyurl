interface CacheEntry {
    value: string;
    expiresAt: number;
}

export class InMemoryUrlCache {
    private cache: Map<string, CacheEntry> = new Map();
    private readonly maxEntries: number;
    private readonly ttlMs: number;

    constructor(options?: { maxEntries?: number; ttlMs?: number }) {
        this.maxEntries = options?.maxEntries ?? 10_000;
        this.ttlMs = options?.ttlMs ?? 5 * 60 * 1000; // 5 minutes default
    }

    get(shortCode: string): string | null {
        const entry = this.cache.get(shortCode);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(shortCode);
            return null;
        }

        return entry.value;
    }

    set(shortCode: string, originalUrl: string): void {
        // LRU-style eviction: if at capacity, remove oldest entry
        if (this.cache.size >= this.maxEntries && !this.cache.has(shortCode)) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }

        this.cache.set(shortCode, {
            value: originalUrl,
            expiresAt: Date.now() + this.ttlMs,
        });
    }

    invalidate(shortCode: string): void {
        this.cache.delete(shortCode);
    }

    clear(): void {
        this.cache.clear();
    }

    get size(): number {
        return this.cache.size;
    }
}
