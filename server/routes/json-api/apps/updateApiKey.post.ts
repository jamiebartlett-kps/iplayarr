import appService from '../../../service/appService';

export default defineEventHandler(() => {
    appService.updateApiKey();
    return true;
});
