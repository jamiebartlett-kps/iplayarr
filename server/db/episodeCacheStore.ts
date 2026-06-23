import { eq } from 'drizzle-orm';

import { episodeCache } from './schema';
import { db } from './index';

// Key-value store over the episode_cache table. Mirrors the subset of the old
// QueuedStorage API used by episodeCacheService for episode blobs (offSchedule_*
// and per-definition-name keys), preserving that service's exact key semantics.
// The `url` column is denormalised from the stored payload so getEpisodeCacheForUrl
// can look up by URL.
export const episodeCacheStore = {
    getItem: async (key: string): Promise<any> => {
        const row = db.select().from(episodeCache).where(eq(episodeCache.key, key)).get();
        return row ? row.data : undefined;
    },

    setItem: async (key: string, value: any): Promise<void> => {
        const data = value === undefined ? null : value;
        const url = data && typeof data === 'object' && 'url' in data ? (data.url ?? null) : null;
        db.insert(episodeCache)
            .values({ key, url, data })
            .onConflictDoUpdate({ target: episodeCache.key, set: { url, data } })
            .run();
    },

    removeItem: async (key: string): Promise<void> => {
        db.delete(episodeCache).where(eq(episodeCache.key, key)).run();
    },

    keys: async (): Promise<string[]> => {
        return db.select({ key: episodeCache.key }).from(episodeCache).all().map((row) => row.key);
    },

    values: async (): Promise<any[]> => {
        return db.select().from(episodeCache).all().map((row) => row.data);
    },
};
