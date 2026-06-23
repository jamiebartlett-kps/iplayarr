import { Response } from 'express';
import request from 'supertest';

import { NewzNabEndpointDirectory } from '../../server/constants/EndpointDirectory';
import apiHandler from '../../server/routes/api/index';
import configService from '../../server/service/configService';
import { ApiError } from '../../server/types/responses/ApiResponse';
import { h3Server } from '../helpers/h3App';

// Mocking dependencies
jest.mock('../../server/service/configService');
jest.mock('../../server/constants/EndpointDirectory', () => ({
    SabNZBDEndpointDirectory: {
        someEndpoint: jest.fn(async (_, res: Response) => {
            res.status(200).json({ success: true });
            return true;
        }),
    },
    NewzNabEndpointDirectory: {
        someEndpoint: jest.fn(async (_, res: Response) => {
            res.status(200).json({ success: true });
            return true;
        }),
    },
}));

describe('API Route Tests', () => {
    const app = h3Server((r) => {
        r.get('/api', apiHandler);
        r.post('/api', apiHandler);
    });

    it('should return 401 if API key is incorrect', async () => {
        (configService.getParameter as jest.Mock).mockResolvedValue('correct-api-key');

        const response = await request(app).post('/api').query({ apikey: 'wrong-api-key' }).send();

        expect(response.status).toBe(401);
        expect(response.body.error).toBe(ApiError.NOT_AUTHORISED);
    });

    it('should return 404 if endpoint is not found', async () => {
        (configService.getParameter as jest.Mock).mockResolvedValue('correct-api-key');

        const response = await request(app).post('/api').query({ apikey: 'correct-api-key', mode: 'invalidMode' }).send();

        expect(response.status).toBe(404);
        expect(response.body.error).toBe(ApiError.API_NOT_FOUND);
    });

    it('should call the correct endpoint if API key is correct and endpoint exists', async () => {
        (configService.getParameter as jest.Mock).mockResolvedValue('correct-api-key');

        const response = await request(app).post('/api').query({ apikey: 'correct-api-key', t: 'someEndpoint' }).send();

        expect(response.status).toBe(200);
        expect((NewzNabEndpointDirectory as any).someEndpoint).toHaveBeenCalled();
    });
});
