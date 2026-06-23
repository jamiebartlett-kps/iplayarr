import request from 'supertest';

import cacheSizesGet from '../../../server/routes/json-api/stats/cacheSizes.get';
import grabHistoryGet from '../../../server/routes/json-api/stats/grabHistory.get';
import searchHistoryGet from '../../../server/routes/json-api/stats/searchHistory.get';
import uptimeGet from '../../../server/routes/json-api/stats/uptime.get';
import statisticsService from '../../../server/service/stats/StatisticsService';
import { h3Server } from '../../helpers/h3App';

jest.mock('../../../server/service/stats/StatisticsService');

const app = h3Server((r) => {
    r.get('/searchHistory', searchHistoryGet);
    r.get('/grabHistory', grabHistoryGet);
    r.get('/uptime', uptimeGet);
    r.get('/cacheSizes', cacheSizesGet);
});

describe('Statistics Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /searchHistory', () => {
        it('returns search history', async () => {
            const history = ['search1', 'search2'];
            (statisticsService.getSearchHistory as jest.Mock).mockReturnValue(history);

            const res = await request(app).get('/searchHistory');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(history);
        });

        it('returns limited search history', async () => {
            const history = ['search1', 'search2'];
            (statisticsService.getSearchHistory as jest.Mock).mockReturnValue(history);

            const res = await request(app).get('/searchHistory?limit=1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([history[1]]);
        });

        it('returns filtered search history', async () => {
            const filteredHistory = [{ term: 'search1' }, { term: 'search2' }];
            const history = [...filteredHistory, { term: '*' }];
            (statisticsService.getSearchHistory as jest.Mock).mockReturnValue(history);

            const unfilteredRes = await request(app).get('/searchHistory');
            expect(unfilteredRes.status).toBe(200);
            expect(unfilteredRes.body).toEqual(history);

            const filteredRes = await request(app).get('/searchHistory?filterRss=true');
            expect(filteredRes.status).toBe(200);
            expect(filteredRes.body).toEqual(filteredHistory);
        });
    });

    describe('GET /grabHistory', () => {
        it('returns grab history', async () => {
            const history = ['grab1', 'grab2'];
            (statisticsService.getGrabHistory as jest.Mock).mockReturnValue(history);

            const res = await request(app).get('/grabHistory');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(history);
        });

        it('returns limited grab history', async () => {
            const history = ['grab1', 'grab2'];
            (statisticsService.getGrabHistory as jest.Mock).mockReturnValue(history);

            const res = await request(app).get('/grabHistory?limit=1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([history[1]]);
        });
    });

    describe('GET /uptime', () => {
        it('returns uptime', async () => {
            const uptime = 100;
            (statisticsService.getUptime as jest.Mock).mockReturnValue(uptime);

            const res = await request(app).get('/uptime');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ uptime });
        });
    });

    describe('GET /cacheSizes', () => {
        it('returns cacheSizes', async () => {
            const cacheSizes = { search: 100, schedule: 500 };

            (statisticsService.getCacheSizes as jest.Mock).mockReturnValue(cacheSizes);

            const res = await request(app).get('/cacheSizes');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(cacheSizes);
        });
    });
});
