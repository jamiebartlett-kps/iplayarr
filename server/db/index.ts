import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import * as schema from './schema';

// SQLite is the persistence store. Path is configurable via DATABASE_PATH
// (Docker sets /config/iplayarr.db); tests use ':memory:'.
const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'iplayarr.db');

if (dbPath !== ':memory:') {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}

// Cache the connection on the process object. In production this is a harmless
// singleton; under Jest it lets the (native) better-sqlite3 instance be reused
// across the per-file module sandboxes instead of being re-instantiated (which
// throws on the native addon's second initialisation).
const CACHE_KEY = '__iplayarr_sqlite__';
const cacheHost = process as unknown as Record<string, Database.Database>;

export const sqlite: Database.Database =
    cacheHost[CACHE_KEY] ??
    (cacheHost[CACHE_KEY] = (() => {
        const instance = new Database(dbPath);
        instance.pragma('journal_mode = WAL');
        return instance;
    })());

export const db = drizzle(sqlite, { schema });

// Idempotent schema creation. Run at startup (and in tests) instead of bundling
// drizzle-kit migration files into the Nitro output. Kept in sync with schema.ts.
export function ensureSchema(): void {
    sqlite.exec(`
        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS apps (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS synonyms (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pid TEXT NOT NULL,
            data TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS search_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS grab_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS episode_cache_definitions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            cache_refreshed INTEGER
        );
        CREATE TABLE IF NOT EXISTS episode_cache (
            key TEXT PRIMARY KEY,
            url TEXT,
            data TEXT
        );
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);
}

export { schema };
