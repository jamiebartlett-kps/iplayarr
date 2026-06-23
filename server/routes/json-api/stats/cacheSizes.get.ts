import statisticsService from '../../../service/stats/StatisticsService';

export default defineEventHandler(async () => {
    const cacheSizes = await statisticsService.getCacheSizes();
    return cacheSizes;
});
