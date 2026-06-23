import searchFacade from '../../facade/searchFacade';
import { IPlayerSearchResult } from '../../types/IPlayerSearchResult';
import { ApiError, ApiResponse } from '../../types/responses/ApiResponse';

export default defineEventHandler(async (event) => {
    const { q } = getQuery(event) as any;
    try {
        const result: IPlayerSearchResult[] = await searchFacade.search(q);
        return result;
    } catch (error: any) {
        setResponseStatus(event, 500);
        return { error: ApiError.INTERNAL_ERROR, message: error?.message || 'Search failed' } as ApiResponse;
    }
});
