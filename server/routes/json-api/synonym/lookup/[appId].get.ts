import arrFacade from '../../../../facade/arrFacade';
import appService from '../../../../service/appService';
import { App } from '../../../../types/App';
import { ApiError, ApiResponse } from '../../../../types/responses/ApiResponse';
import { ArrLookupResponse } from '../../../../types/responses/arr/ArrLookupResponse';

export default defineEventHandler(async (event) => {
    const appId = getRouterParam(event, 'appId') as string;
    const { term } = getQuery(event) as { term?: string };

    const app: App | undefined = await appService.getApp(appId);
    if (app) {
        try {
            const results: ArrLookupResponse[] = await arrFacade.search(app, term);
            return results;
        } catch (err: any) {
            const apiResponse: ApiResponse = {
                error: ApiError.INTERNAL_ERROR,
                message: err?.message,
            };
            setResponseStatus(event, 400);
            return apiResponse;
        }
    }
    const apiResponse: ApiResponse = {
        error: ApiError.INTERNAL_ERROR,
        message: `App ${appId} not found`,
    };
    setResponseStatus(event, 400);
    return apiResponse;
});
