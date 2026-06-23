import request from 'supertest';

import cacheRefresh from '../../server/routes/json-api/cache-refresh.get';
import details from '../../server/routes/json-api/details.get';
import download from '../../server/routes/json-api/download.get';
import nzbTest from '../../server/routes/json-api/nzb/test.post';
import search from '../../server/routes/json-api/search.get';
import { h3Server } from '../helpers/h3App';

// Mock dependencies
jest.mock('../../server/facade/nzbFacade');
jest.mock('../../server/facade/scheduleFacade');
jest.mock('../../server/facade/searchFacade');
jest.mock('../../server/service/iplayerDetailsService');
jest.mock('../../server/service/queueService');

import nzbFacade from '../../server/facade/nzbFacade';
import scheduleFacade from '../../server/facade/scheduleFacade';
import searchFacade from '../../server/facade/searchFacade';
import iplayerDetailsService from '../../server/service/iplayerDetailsService';
import queueService from '../../server/service/queueService';
import { ApiError } from '../../server/types/responses/ApiResponse';

const app = h3Server((r) => {
    r.post('/nzb/test', nzbTest);
    r.get('/search', search);
    r.get('/details', details);
    r.get('/download', download);
    r.get('/cache-refresh', cacheRefresh);
});

describe('JsonApiRoute', () => {
    describe('POST /nzb/test', () => {
        it('should return status true on success', async () => {
            (nzbFacade.testConnection as jest.Mock).mockResolvedValue(true);

            const res = await request(app).post('/nzb/test').send({
                NZB_URL: 'http://example.com',
                NZB_API_KEY: 'abc123',
                NZB_TYPE: 'nzbget',
                NZB_USERNAME: 'user',
                NZB_PASSWORD: 'pass',
            });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ status: true });
        });

        it('should return 500 with error on failure', async () => {
            (nzbFacade.testConnection as jest.Mock).mockResolvedValue('Connection failed');

            const res = await request(app).post('/nzb/test').send({
                NZB_URL: 'http://example.com',
                NZB_API_KEY: 'abc123',
                NZB_TYPE: 'nzbget',
                NZB_USERNAME: 'user',
                NZB_PASSWORD: 'pass',
            });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: ApiError.INTERNAL_ERROR, message: 'Connection failed' });
        });
    });

    describe('GET /search', () => {
        it('should return search results', async () => {
            const mockResults = [{ title: 'Episode 1', pid: 'b012345' }];
            (searchFacade.search as jest.Mock).mockResolvedValue(mockResults);

            const res = await request(app).get('/search').query({ q: 'test' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockResults);
        });
    });

    describe('GET /details', () => {
        it('should return episode details', async () => {
            const mockDetails = [{ title: 'Test Show', pid: 'p01abc' }];
            (iplayerDetailsService.details as jest.Mock).mockResolvedValue(mockDetails);

            const res = await request(app).get('/details').query({ pid: 'p01abc' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockDetails[0]);
        });
    });

    describe('GET /download', () => {
        it('should add item to queue and return success', async () => {
            const addToQueueMock = queueService.addToQueue as jest.Mock;
            addToQueueMock.mockImplementation(() => {});

            const res = await request(app).get('/download').query({ pid: 'p01xyz', nzbName: 'show.nzb', type: 'tv' });

            expect(addToQueueMock).toHaveBeenCalledWith('p01xyz', 'show.nzb', 'tv');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ status: true });
        });
    });

    describe('GET /cache-refresh', () => {
        it('should trigger cache refresh and return success', async () => {
            const refreshCacheMock = scheduleFacade.refreshCache as jest.Mock;
            refreshCacheMock.mockImplementation(() => {});

            const res = await request(app).get('/cache-refresh');

            expect(refreshCacheMock).toHaveBeenCalled();
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ status: true });
        });
    });
});
