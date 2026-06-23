jest.mock('../../server/service/socketService', () => ({
    __esModule: true,
    default: { emit: jest.fn() },
}));

import historyService from '../../server/service/historyService';
import socketService from '../../server/service/socketService';
import { VideoType } from '../../server/types/IPlayerSearchResult';
import { QueueEntry } from '../../server/types/QueueEntry';
import { QueueEntryStatus } from '../../server/types/responses/sabnzbd/QueueResponse';

const sampleEntry: QueueEntry = {
    pid: '123',
    status: QueueEntryStatus.QUEUED,
    nzbName: 'Test NZB',
    type: VideoType.MOVIE,
    details: {},
    appId: 'radarr',
};

describe('historyService', () => {
    it('getHistory returns empty array if none exists', async () => {
        const result = await historyService.getHistory();
        expect(result).toEqual([]);
    });

    it('addHistory stores a completed item', async () => {
        await historyService.addHistory(sampleEntry);
        const history = await historyService.getHistory();
        expect(history).toEqual([
            expect.objectContaining({ pid: '123', status: QueueEntryStatus.COMPLETE }),
        ]);
        expect(socketService.emit).toHaveBeenCalled();
    });

    it('addRelay stores raw item', async () => {
        await historyService.addRelay(sampleEntry);
        const history = await historyService.getHistory();
        expect(history).toEqual([
            expect.objectContaining({ pid: '123', status: QueueEntryStatus.QUEUED }),
        ]);
    });

    it('addArchive stores item with CANCELLED status', async () => {
        await historyService.addArchive(sampleEntry);
        const history = await historyService.getHistory();
        expect(history).toEqual([
            expect.objectContaining({ pid: '123', status: QueueEntryStatus.CANCELLED }),
        ]);
    });

    it('removeHistory filters out entry by PID', async () => {
        await historyService.addRelay({ ...sampleEntry, pid: '123' });
        await historyService.addRelay({ ...sampleEntry, pid: '456' });
        await historyService.removeHistory('123');
        const history = await historyService.getHistory();
        expect(history).toEqual([expect.objectContaining({ pid: '456' })]);
    });
});
