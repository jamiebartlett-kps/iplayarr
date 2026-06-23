import statisticsService from '../../../service/stats/StatisticsService';

export default defineEventHandler(async () => {
    const uptime = await statisticsService.getUptime();
    return { uptime };
});
