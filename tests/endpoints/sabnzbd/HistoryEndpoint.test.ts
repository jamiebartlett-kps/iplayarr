import { NextFunction, Request, Response } from 'express';

import handler from '../../../server/endpoints/sabnzbd/HistoryEndpoint';
import configService from '../../../server/service/configService';
import historyService from '../../../server/service/historyService';
import { IplayarrParameter } from '../../../server/types/IplayarrParameters';
import { VideoType } from '../../../server/types/IPlayerSearchResult';
import { QueueEntry } from '../../../server/types/QueueEntry';
import { QueueEntryStatus } from '../../../server/types/responses/sabnzbd/QueueResponse';

jest.mock('../../../server/service/configService');
jest.mock('../../../server/service/historyService');

describe('sabnzbdActionEndpoint', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = { query: {} };
        res = { json: jest.fn() };
        next = jest.fn();
    });

    describe('delete handler', () => {
        it('should delete an entry when value is provided and ARCHIVE_ENABLED is true', async () => {
            req.query = { value: 'test-id', name: 'delete' };

            (configService.getParameter as jest.Mock).mockResolvedValue('true');

            await handler(req as Request, res as Response, next);

            expect(configService.getParameter).toHaveBeenCalledWith(IplayarrParameter.ARCHIVE_ENABLED);
            expect(historyService.removeHistory).toHaveBeenCalledWith('test-id', true);
            expect(res.json).toHaveBeenCalledWith({ status: true });
        });

        it('should respond with false when value is missing', async () => {
            req.query = { name: 'delete' };

            await handler(req as Request, res as Response, next);

            expect(res.json).toHaveBeenCalledWith({ status: false });
        });
    });

    describe('_default handler', () => {
        it('should return filtered and formatted history', async () => {
            const queueEntries: QueueEntry[] = [
                {
                    pid: 'id1',
                    nzbName: 'testfile',
                    status: QueueEntryStatus.COMPLETE,
                    details: { size: 1 },
                    type: VideoType.TV
                },
                {
                    pid: 'id2',
                    nzbName: 'skipfile',
                    status: QueueEntryStatus.CANCELLED,
                    details: { size: 2 },
                    type: VideoType.TV
                },
                {
                    pid: 'id3',
                    nzbName: 'skipfile2',
                    status: QueueEntryStatus.FORWARDED,
                    details: { size: 3 },
                    type: VideoType.TV
                },
            ];

            (historyService.getHistory as jest.Mock).mockResolvedValue(queueEntries);
            (configService.getParameter as jest.Mock).mockResolvedValueOnce('/complete');
            (configService.getParameter as jest.Mock).mockResolvedValueOnce('mp4');

            await handler(req as Request, res as Response, next);

            expect(historyService.getHistory).toHaveBeenCalled();
            expect(configService.getParameter).toHaveBeenCalledWith(IplayarrParameter.COMPLETE_DIR);

            const responseArg = (res.json as jest.Mock).mock.calls[0][0];
            expect(responseArg.history.slots).toHaveLength(1);
            expect(responseArg.history.slots[0]).toMatchObject({
                duplicate_key: 'id1',
                nzb_name: 'testfile.nzb',
                name: 'testfile.mp4',
                storage: '/complete/testfile.mp4',
                path: '/complete/testfile.mp4',
                url: 'testfile.nzb',
                bytes: 1048576,
                size: '1 MB',
            });
        });
    });
});
