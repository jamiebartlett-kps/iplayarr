# v2 — SQLite/Drizzle persistence; optional Redis cache

Replaces Redis-as-everything with **SQLite (Drizzle) for persistence** and
**optional Redis for caching**.

## Decisions (chosen by owner)
- **Schema:** relational tables (one per entity).
- **Existing data:** auto-migrate from a legacy Redis deployment on first boot.
- **Driver:** `better-sqlite3`.

## What moved where
| Data | Before (Redis) | After |
|------|----------------|-------|
| config | `config` JSON blob | `config(key,value)` table |
| apps | `apps` JSON array | `apps(id, data)` |
| synonyms | `synonyms` JSON array | `synonyms(id, data)` |
| download history | `history` JSON array | `history(id, pid, data)` |
| search/grab stats | `RedisFIFOQueue` lists | `search_history` / `grab_history` (capped 500 via `SqliteFIFOQueue`) |
| off-schedule defs | `series-cache-definition` blob | `episode_cache_definitions` table |
| off-schedule blobs | `offSchedule_*` keys | `episode_cache(key, url, data)` |
| uptime | `iplayarr_uptime` key | `meta` table |
| TTL caches (search/schedule/skyhook/details) | Redis keys | **cache backend**: Redis if enabled, else in-memory |
| recent logs | Redis list | in-memory ring buffer |

## Key modules
- `server/db/{schema,index,fifo,episodeCacheStore,migrateFromRedis}.ts`
- `server/service/cache/backend.ts` (+ reimplemented `redisCacheService.ts`)
- `server/service/redis/redisService.ts` — now lazy/optional
- `server/plugins/0.database.ts` — ensureSchema → migrateFromRedis → setUptime

## Config
- `DATABASE_PATH` — SQLite file (default `./data/iplayarr.db`; Docker `/config/iplayarr.db`; tests `:memory:`).
- `REDIS_ENABLED=true` or `REDIS_HOST=...` — enable Redis caching; otherwise in-memory.

## Verification
- `npm run build` OK; SQLite persistence works with no Redis and survives restart.
- Legacy Redis data (config/apps/synonyms/history/stats) migrates correctly on first boot.
- `npm test` → 360 tests pass (service tests run against in-memory SQLite). The one
  non-loading suite (`downloadFacade`) is the pre-existing `tmp`/`fengari` env issue.

## Notes / follow-ups
- Docker still bundles & auto-starts Redis when `REDIS_HOST` is unset, so existing
  installs' data is reachable for the one-time migration and Redis remains available
  if `REDIS_ENABLED=true`. It is otherwise unused (in-memory cache by default).
- `apps`/`synonyms`/`history`/stats use an `(id, data-json)` row-per-entity shape
  because their payloads are nested; `config`/`episode_cache_definitions` are fully typed.
