import episodeCacheService from '../../../service/episodeCacheService';
import { EpisodeCacheDefinition } from '../../../types/responses/EpisodeCacheTypes';

export default defineEventHandler(async () => {
    const cachedSeries: EpisodeCacheDefinition[] = await episodeCacheService.getCachedSeries();
    return cachedSeries;
});
