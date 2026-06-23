import { getCacheBackend } from '../cache/backend';

// TTL cache keyed by `${prefix}_${key}`. Backed by Redis when enabled, otherwise
// an in-memory store (see cache/backend.ts). Public API is unchanged so existing
// call sites (searchFacade, iplayerDetailsService, schedule, skyhook) are intact.
export default class RedisCacheService<T> {
    prefix: string;
    ttl: number;

    constructor(prefix: string, ttl: number) {
        this.prefix = prefix;
        this.ttl = ttl;
    }

    async getOr(key: string, fetchFunction: (key: string) => Promise<T>): Promise<T> {
        const cached = await this.get(key);
        if (cached) {
            return cached;
        } else {
            const value = await fetchFunction(key);
            await this.set(key, value);
            return value;
        }
    }

    async get(key: string): Promise<T | undefined> {
        const data = await getCacheBackend().get(`${this.prefix}_${key}`);
        if (data != null) {
            return JSON.parse(data) as T;
        }
        return undefined;
    }

    async set(key: string, value: T): Promise<void> {
        await getCacheBackend().set(`${this.prefix}_${key}`, JSON.stringify(value), this.ttl);
    }

    async del(key: string): Promise<void> {
        await getCacheBackend().del(`${this.prefix}_${key}`);
    }

    async clear(): Promise<void> {
        await getCacheBackend().delByPattern(`${this.prefix}_*`);
    }

    static async getCacheSizeInMB(patterns: string[]): Promise<string> {
        return getCacheBackend().sizeMB(patterns);
    }
}
