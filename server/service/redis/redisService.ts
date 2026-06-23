import Redis, { RedisOptions } from 'ioredis';

// Redis is now OPTIONAL — it is only used as a cache backend (persistence moved
// to SQLite). It is enabled when REDIS_ENABLED=true or a REDIS_HOST is set;
// otherwise an in-memory cache is used and no client is ever created.

export function isRedisEnabled(): boolean {
    return process.env.REDIS_ENABLED === 'true' || !!process.env.REDIS_HOST;
}

function buildOptions(overrides: RedisOptions = {}): RedisOptions {
    const options: RedisOptions = {
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
        tls: process.env.REDIS_SSL === 'true' ? {} : undefined,
        ...overrides,
    };
    if (process.env.REDIS_PASSWORD) {
        options.password = process.env.REDIS_PASSWORD;
    }
    return options;
}

let client: Redis | undefined;

// Lazily creates (once) and returns the shared Redis client. Only call when
// isRedisEnabled() is true.
export function getRedisClient(): Redis {
    if (!client) {
        client = new Redis(buildOptions());
    }
    return client;
}

// Creates a short-lived, fail-fast client for the one-time startup migration
// from a legacy Redis-backed deployment. Caller is responsible for quitting it.
export function createMigrationClient(): Redis {
    return new Redis(
        buildOptions({
            lazyConnect: true,
            connectTimeout: 1500,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null,
            reconnectOnError: () => false,
        })
    );
}
