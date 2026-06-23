import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { App } from '../types/App';
import { GrabHistoryEntry } from '../types/data/GrabHistoryEntry';
import { SearchHistoryEntry } from '../types/data/SearchHistoryEntry';
import { QueueEntry } from '../types/QueueEntry';
import { Synonym } from '../types/Synonym';

// Relational tables (one per entity, row per item). Nested/flexible payloads are
// stored in JSON columns; flat entities use typed columns. This replaces the
// previous Redis key->JSON-blob persistence (QueuedStorage / RedisFIFOQueue).

// IplayarrParameter -> value map (was the Redis 'config' blob).
export const config = sqliteTable('config', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
});

// App[] (was Redis 'apps'). App is heavily nested, so the payload is JSON.
export const apps = sqliteTable('apps', {
    id: text('id').primaryKey(),
    data: text('data', { mode: 'json' }).notNull().$type<App>(),
});

// Synonym[] (was Redis 'synonyms').
export const synonyms = sqliteTable('synonyms', {
    id: text('id').primaryKey(),
    data: text('data', { mode: 'json' }).notNull().$type<Synonym>(),
});

// QueueEntry[] download history (was Redis 'history'). pid is not unique
// (relays/archives), so an autoincrement id preserves insertion order and
// removeHistory deletes by pid.
export const history = sqliteTable('history', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    pid: text('pid').notNull(),
    data: text('data', { mode: 'json' }).notNull().$type<QueueEntry>(),
});

// Capped FIFO stats (was RedisFIFOQueue 'search-history' / 'grab-history').
export const searchHistory = sqliteTable('search_history', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    data: text('data', { mode: 'json' }).notNull().$type<SearchHistoryEntry>(),
});
export const grabHistory = sqliteTable('grab_history', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    data: text('data', { mode: 'json' }).notNull().$type<GrabHistoryEntry>(),
});

// Off-schedule episode cache definitions (was Redis 'series-cache-definition').
export const episodeCacheDefinitions = sqliteTable('episode_cache_definitions', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    cacheRefreshed: integer('cache_refreshed', { mode: 'timestamp_ms' }),
});

// Episode cache blobs, accessed by arbitrary key (was Redis 'offSchedule_*' and
// other bare keys written by episodeCacheService). Kept key-value to preserve
// that service's exact key semantics.
export const episodeCache = sqliteTable('episode_cache', {
    key: text('key').primaryKey(),
    url: text('url'),
    // nullable: episodeCacheService may store an undefined/null blob under a
    // definition name (preserved quirk).
    data: text('data', { mode: 'json' }),
});

// Misc runtime/bookkeeping (uptime start, redis-migration marker).
export const meta = sqliteTable('meta', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
});
