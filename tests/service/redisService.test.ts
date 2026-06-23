import type { RedisOptions } from 'ioredis';

jest.mock('ioredis', () => {
    return jest.fn().mockImplementation((options: RedisOptions) => {
        return {
            options,
            connect: jest.fn(),
            on: jest.fn(),
            disconnect: jest.fn(),
        };
    });
});

describe('redisService (optional Redis)', () => {
    beforeEach(() => {
        jest.resetModules(); // Clear import cache so the lazy client is recreated

        delete process.env.REDIS_HOST;
        delete process.env.REDIS_PORT;
        delete process.env.REDIS_SSL;
        delete process.env.REDIS_PASSWORD;
        delete process.env.REDIS_ENABLED;
    });

    describe('isRedisEnabled', () => {
        it('is false by default', async () => {
            const { isRedisEnabled } = await import('../../server/service/redis/redisService');
            expect(isRedisEnabled()).toBe(false);
        });

        it('is true when REDIS_ENABLED=true', async () => {
            process.env.REDIS_ENABLED = 'true';
            const { isRedisEnabled } = await import('../../server/service/redis/redisService');
            expect(isRedisEnabled()).toBe(true);
        });

        it('is true when REDIS_HOST is set', async () => {
            process.env.REDIS_HOST = 'myhost';
            const { isRedisEnabled } = await import('../../server/service/redis/redisService');
            expect(isRedisEnabled()).toBe(true);
        });
    });

    describe('getRedisClient', () => {
        it('lazily creates a client with default options', async () => {
            process.env.REDIS_SSL = 'false';
            const mod = await import('../../server/service/redis/redisService');
            const Redis = (await import('ioredis')).default;

            const client: any = mod.getRedisClient();

            expect(Redis).toHaveBeenCalledWith({ host: '127.0.0.1', port: 6379, tls: undefined });
            expect(client.options).toEqual({ host: '127.0.0.1', port: 6379, tls: undefined });
        });

        it('uses custom host and port from env', async () => {
            process.env.REDIS_HOST = 'myhost';
            process.env.REDIS_PORT = '6380';
            process.env.REDIS_SSL = 'false';
            const mod = await import('../../server/service/redis/redisService');
            const Redis = (await import('ioredis')).default;

            mod.getRedisClient();

            expect(Redis).toHaveBeenCalledWith({ host: 'myhost', port: 6380, tls: undefined });
        });

        it('enables TLS if REDIS_SSL is true', async () => {
            process.env.REDIS_SSL = 'true';
            const mod = await import('../../server/service/redis/redisService');
            const Redis = (await import('ioredis')).default;

            mod.getRedisClient();

            expect(Redis).toHaveBeenCalledWith(expect.objectContaining({ tls: {} }));
        });

        it('sets password if REDIS_PASSWORD is provided', async () => {
            process.env.REDIS_PASSWORD = 'secret';
            process.env.REDIS_SSL = 'false';
            const mod = await import('../../server/service/redis/redisService');
            const Redis = (await import('ioredis')).default;

            mod.getRedisClient();

            expect(Redis).toHaveBeenCalledWith(expect.objectContaining({ password: 'secret' }));
        });

        it('returns the same client on repeated calls (singleton)', async () => {
            const mod = await import('../../server/service/redis/redisService');
            const Redis = (await import('ioredis')).default;

            mod.getRedisClient();
            mod.getRedisClient();

            expect(Redis).toHaveBeenCalledTimes(1);
        });
    });
});
