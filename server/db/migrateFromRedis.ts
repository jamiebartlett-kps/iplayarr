import { eq } from 'drizzle-orm';
import type { Redis } from 'ioredis';

import { createMigrationClient } from '../service/redis/redisService';
import {
    apps,
    config,
    episodeCache,
    episodeCacheDefinitions,
    grabHistory,
    history,
    meta,
    searchHistory,
    synonyms,
} from './schema';
import { db } from './index';

const MIGRATED_KEY = 'redis_migrated';

// One-time import of a legacy Redis-backed deployment into SQLite. Runs at most
// once (guarded by a meta marker). Best-effort: if Redis is unreachable (fresh
// install) it simply marks migration done and moves on.
export async function migrateFromRedis(): Promise<void> {
    const already = db.select().from(meta).where(eq(meta.key, MIGRATED_KEY)).get();
    if (already) {
        return;
    }

    let redis: Redis | undefined;
    try {
        redis = createMigrationClient();
        // Swallow connection errors (fresh installs have no Redis) so ioredis
        // does not log them as "Unhandled error event".
        redis.on('error', () => {});
        await redis.connect();
        await importLegacyData(redis);
        // eslint-disable-next-line no-console
        console.log('[migrate] Imported legacy Redis data into SQLite.');
    } catch {
        // No reachable Redis (fresh install) or read error — nothing to migrate.
    } finally {
        if (redis) {
            redis.disconnect();
        }
        db.insert(meta)
            .values({ key: MIGRATED_KEY, value: new Date().toISOString() })
            .onConflictDoUpdate({ target: meta.key, set: { value: new Date().toISOString() } })
            .run();
    }
}

async function getJson<T>(redis: Redis, key: string): Promise<T | undefined> {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
}

async function importLegacyData(redis: Redis): Promise<void> {
    // config: single 'config' key -> { PARAM: value }
    const configMap = await getJson<Record<string, string>>(redis, 'config');
    if (configMap) {
        for (const [key, value] of Object.entries(configMap)) {
            if (value == null) continue;
            db.insert(config)
                .values({ key, value: String(value) })
                .onConflictDoUpdate({ target: config.key, set: { value: String(value) } })
                .run();
        }
    }

    // apps / synonyms: arrays of objects with an id
    const appList = (await getJson<any[]>(redis, 'apps')) ?? [];
    for (const app of appList) {
        db.insert(apps).values({ id: app.id, data: app }).onConflictDoNothing().run();
    }
    const synonymList = (await getJson<any[]>(redis, 'synonyms')) ?? [];
    for (const synonym of synonymList) {
        db.insert(synonyms).values({ id: synonym.id, data: synonym }).onConflictDoNothing().run();
    }

    // history: array of QueueEntry (insertion order preserved)
    const historyList = (await getJson<any[]>(redis, 'history')) ?? [];
    for (const entry of historyList) {
        db.insert(history).values({ pid: entry.pid, data: entry }).run();
    }

    // off-schedule cache definitions + their episode blobs
    const definitions = (await getJson<any[]>(redis, 'series-cache-definition')) ?? [];
    for (const def of definitions) {
        db.insert(episodeCacheDefinitions)
            .values({
                id: def.id,
                name: def.name,
                url: def.url,
                cacheRefreshed: def.cacheRefreshed ? new Date(def.cacheRefreshed) : null,
            })
            .onConflictDoNothing()
            .run();
        // blobs may be stored under the definition name
        const named = await getJson<any>(redis, def.name);
        if (named) {
            db.insert(episodeCache)
                .values({ key: def.name, url: named.url ?? null, data: named })
                .onConflictDoNothing()
                .run();
        }
    }
    const offScheduleKeys = await redis.keys('offSchedule_*');
    for (const key of offScheduleKeys) {
        const blob = await getJson<any>(redis, key);
        if (blob) {
            db.insert(episodeCache)
                .values({ key, url: blob.url ?? null, data: blob })
                .onConflictDoNothing()
                .run();
        }
    }

    // capped FIFO stats lists (redis lists are newest-first; insert oldest-first
    // so the SQLite autoincrement order matches getItems() newest-first).
    await importList(redis, 'search-history', searchHistory);
    await importList(redis, 'grab-history', grabHistory);
}

async function importList(redis: Redis, key: string, table: any): Promise<void> {
    const items = await redis.lrange(key, 0, -1);
    for (const raw of items.reverse()) {
        try {
            db.insert(table).values({ data: JSON.parse(raw) }).run();
        } catch {
            // skip malformed entries
        }
    }
}
