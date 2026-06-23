import RedisCacheService from '../../server/service/redis/redisCacheService';

// With no REDIS_* env set (the default in tests), the cache uses the in-memory
// backend. These exercise the public API through that backend.
describe('RedisCacheService (in-memory backend)', () => {
    const service = new RedisCacheService<{ hello: string }>('test', 60);

    beforeEach(async () => {
        await service.clear();
    });

    it('set then get returns the value', async () => {
        await service.set('myKey', { hello: 'world' });
        expect(await service.get('myKey')).toEqual({ hello: 'world' });
    });

    it('get returns undefined when missing', async () => {
        expect(await service.get('missingKey')).toBeUndefined();
    });

    it('del removes a key', async () => {
        await service.set('k', { hello: 'x' });
        await service.del('k');
        expect(await service.get('k')).toBeUndefined();
    });

    it('clear removes all keys with the prefix', async () => {
        await service.set('a', { hello: '1' });
        await service.set('b', { hello: '2' });
        await service.clear();
        expect(await service.get('a')).toBeUndefined();
        expect(await service.get('b')).toBeUndefined();
    });

    it('getOr fetches and caches on miss, reuses on hit', async () => {
        const fetcher = jest.fn().mockResolvedValue({ hello: 'fetched' });
        const first = await service.getOr('g', fetcher);
        const second = await service.getOr('g', fetcher);
        expect(first).toEqual({ hello: 'fetched' });
        expect(second).toEqual({ hello: 'fetched' });
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('getCacheSizeInMB returns a numeric MB string', async () => {
        await service.set('x', { hello: 'y' });
        const size = await RedisCacheService.getCacheSizeInMB(['test_*']);
        expect(size).toMatch(/^\d+\.\d{2}$/);
    });
});
