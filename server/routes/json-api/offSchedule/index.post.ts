import episodeCacheService from '../../../service/episodeCacheService';
import { ApiError, ApiResponse } from '../../../types/responses/ApiResponse';
import { EpisodeCacheDefinition } from '../../../types/responses/EpisodeCacheTypes';
import { OffScheduleFormValidator } from '../../../validators/OffScheduleFormValidator';
import { Validator } from '../../../validators/Validator';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const validator: Validator = new OffScheduleFormValidator();
    const validationResult: { [key: string]: string } = await validator.validate(body);
    if (Object.keys(validationResult).length > 0) {
        const apiResponse: ApiResponse = {
            error: ApiError.INVALID_INPUT,
            invalid_fields: validationResult,
        };
        setResponseStatus(event, 400);
        return apiResponse;
    }

    const { name, url } = body;
    await episodeCacheService.addCachedSeries(url, name);
    const cachedSeries: EpisodeCacheDefinition[] = await episodeCacheService.getCachedSeries();
    return cachedSeries;
});
