import episodeCacheService from '../../../service/episodeCacheService';
import { EpisodeCacheDefinition } from '../../../types/responses/EpisodeCacheTypes';

export default defineEventHandler(async (event) => {
    const { id } = await readBody(event);
    await episodeCacheService.removeCachedSeries(id);
    const cachedSeries: EpisodeCacheDefinition[] = await episodeCacheService.getCachedSeries();
    return cachedSeries;
});
