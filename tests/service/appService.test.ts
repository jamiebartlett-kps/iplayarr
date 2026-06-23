import { v4 as uuidv4 } from 'uuid';

import nzbFacade from '../../server/facade/nzbFacade';
import appService from '../../server/service/appService';
import socketService from '../../server/service/socketService';
import { App } from '../../server/types/App';
import { AppType } from '../../server/types/AppType';

jest.mock('uuid', () => ({ v4: jest.fn() }));

jest.mock('../../server/facade/arrFacade', () => ({
    testConnection: jest.fn(),
    upsertDownloadClient: jest.fn(),
    upsertIndexer: jest.fn(),
}));

jest.mock('../../server/service/configService', () => ({
    getParameter: jest.fn(),
}));

jest.mock('../../server/facade/nzbFacade', () => ({
    testConnection: jest.fn(),
}));

jest.mock('../../server/service/socketService', () => ({
    emit: jest.fn(),
}));

describe('appService', () => {
    it('adds a new app and assigns an ID if not present', async () => {
        const id = 'test-id';
        (uuidv4 as jest.Mock).mockReturnValue(id);
        const app: App = {
            id: undefined,
            type: AppType.RADARR,
            url: 'http://localhost',
            tags: [],
            iplayarr: { host: 'localhost', port: 7878, useSSL: false },
        } as any;

        const result = await appService.addApp(app);

        expect(result?.id).toBe(id);
        const all = await appService.getAllApps();
        expect(all).toEqual(expect.arrayContaining([expect.objectContaining({ id })]));
    });

    it('removes an app', async () => {
        const app: App = { id: '123', type: AppType.RADARR } as any;
        await appService.addApp(app);

        await appService.removeApp('123');

        expect(await appService.getAllApps()).toEqual([]);
    });

    it('updates an app by merging and re-adding it', async () => {
        const app: App = { id: '123', name: 'Old Name', type: AppType.RADARR } as any;
        await appService.addApp(app);

        await appService.updateApp({ id: '123', name: 'New Name' });

        expect(await appService.getApp('123')).toEqual(expect.objectContaining({ name: 'New Name' }));
    });

    it('returns undefined when updating non-existent app', async () => {
        const result = await appService.updateApp({ id: 'does-not-exist', name: 'Test' });

        expect(result).toBeUndefined();
    });

    it('tests connection for NZBGET app', async () => {
        const form = { type: AppType.NZBGET, url: 'url', api_key: 'key', username: 'u', password: 'p' } as any;
        await appService.testAppConnection(form);
        expect(nzbFacade.testConnection).toHaveBeenCalledWith('nzbget', 'url', 'key', 'u', 'p');
    });

    it('updates API key and emits socket events', async () => {
        const app: App = { id: 'abc', type: AppType.RADARR } as any;
        await appService.addApp(app);

        const mockCreateUpdate = jest.spyOn(appService, 'createUpdateIntegrations').mockResolvedValue(app);

        await appService.updateApiKey();

        expect(socketService.emit).toHaveBeenCalledWith(
            'app_update_status',
            expect.objectContaining({ status: 'In Progress' })
        );
        expect(mockCreateUpdate).toHaveBeenCalled();
    });
});
