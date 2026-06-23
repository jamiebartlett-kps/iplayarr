import iplayerDetailsService from '../../service/iplayerDetailsService';
import queueService from '../../service/queueService';
import { VideoType } from '../../types/IPlayerSearchResult';
import { ApiError, ApiResponse } from '../../types/responses/ApiResponse';
import { IPlayerMetadataResponse } from '../../types/responses/IPlayerMetadataResponse';

export default defineEventHandler(async (event) => {
    const query = getQuery(event) as any;
    const { pid } = query;
    let { nzbName, type } = query;

    if (!nzbName || !type) {
        try {
            const metadata: IPlayerMetadataResponse | undefined = await iplayerDetailsService.getMetadata(pid);
            if (!metadata?.programme.display_title) {
                setResponseStatus(event, 500);
                return { error: ApiError.INTERNAL_ERROR, message: 'Unable to find episode details' } as ApiResponse;
            }
            if (!type) {
                if (metadata.programme.categories) {
                    const formatCategory = metadata.programme.categories.find(({ type }) => type == 'format');
                    if (formatCategory && formatCategory.key == 'films') {
                        type = VideoType.MOVIE;
                    }
                }
                type = VideoType.TV;
            }
            if (!nzbName) {
                const { title, subtitle } = metadata.programme.display_title!;
                nzbName = `${title}${type == VideoType.TV && subtitle ? `.${subtitle}` : ''}`;
                nzbName = nzbName.replaceAll('.', '_');
                nzbName = nzbName.replaceAll(' ', '.');
            }
        } catch {
            setResponseStatus(event, 500);
            return { error: ApiError.INTERNAL_ERROR, message: 'Unable to find episode details' } as ApiResponse;
        }
    }

    queueService.addToQueue(pid, nzbName, type);
    return { status: true };
});
