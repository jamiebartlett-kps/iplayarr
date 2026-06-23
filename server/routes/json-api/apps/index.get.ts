import appService from '../../../service/appService';
import { App } from '../../../types/App';

export default defineEventHandler(async () => {
    const allApps: App[] = await appService.getAllApps();
    return allApps;
});
