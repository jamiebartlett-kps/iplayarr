import { getRedisClient, isRedisEnabled } from '../redis/redisService';

// Pluggable cache backend. Redis is used when enabled; otherwise an in-memory
// TTL store is used so caching works with no external dependency. Keys are the
// already-prefixed strings produced by CacheService (e.g. "search_cache_<key>").
export interface CacheBackend {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds: number): Promise<void>;
    del(key: string): Promise<void>;
    delByPattern(pattern: string): Promise<void>;
    sizeMB(patterns: string[]): Promise<string>;
}

// Converts a redis-style glob (only '*' is used here) to a RegExp.
function globToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`);
}

class MemoryCacheBackend implements CacheBackend {
    private store = new Map<string, { value: string; expires: number }>();

    async get(key: string): Promise<string | null> {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (entry.expires <= Date.now()) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }

    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
        this.store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
    }

    async del(key: string): Promise<void> {
        this.store.delete(key);
    }

    async delByPattern(pattern: string): Promise<void> {
        const regex = globToRegex(pattern);
        for (const key of [...this.store.keys()]) {
            if (regex.test(key)) this.store.delete(key);
        }
    }

    async sizeMB(patterns: string[]): Promise<string> {
        const regexes = patterns.map(globToRegex);
        let bytes = 0;
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (entry.expires > now && regexes.some((r) => r.test(key))) {
                bytes += Buffer.byteLength(entry.value) + Buffer.byteLength(key);
            }
        }
        return (bytes / (1024 * 1024)).toFixed(2);
    }
}

class RedisCacheBackend implements CacheBackend {
    async get(key: string): Promise<string | null> {
        try {
            return await getRedisClient().get(key);
        } catch {
            return null;
        }
    }

    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
        await getRedisClient().set(key, value, 'EX', ttlSeconds);
    }

    async del(key: string): Promise<void> {
        await getRedisClient().del(key);
    }

    async delByPattern(pattern: string): Promise<void> {
        const redis = getRedisClient();
        const keys = await redis.keys(pattern);
        if (keys.length) {
            await redis.del(keys);
        }
    }

    async sizeMB(patterns: string[]): Promise<string> {
        const redis = getRedisClient();
        let totalBytes = 0;
        for (const pattern of patterns) {
            let cursor = '0';
            do {
                const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = newCursor;
                if (keys.length > 0) {
                    const sizes = await Promise.all(keys.map((key) => redis.memory('USAGE', key).catch(() => 0)));
                    totalBytes += sizes.reduce((sum: any, size) => sum + (size || 0), 0);
                }
            } while (cursor !== '0');
        }
        return (totalBytes / (1024 * 1024)).toFixed(2);
    }
}

let backend: CacheBackend | undefined;

export function getCacheBackend(): CacheBackend {
    if (!backend) {
        backend = isRedisEnabled() ? new RedisCacheBackend() : new MemoryCacheBackend();
    }
    return backend;
}
