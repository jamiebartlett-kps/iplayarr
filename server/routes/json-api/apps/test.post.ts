import appService from '../../../service/appService';
import { ApiError, ApiResponse } from '../../../types/responses/ApiResponse';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const result = await appService.testAppConnection(body);
    if (result == true) {
        return { status: true };
    } else {
        setResponseStatus(event, 500);
        return { error: ApiError.INTERNAL_ERROR, message: result } as ApiResponse;
    }
});
