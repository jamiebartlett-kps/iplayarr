import { EndpointDirectory, NewzNabEndpointDirectory, SabNZBDEndpointDirectory } from '../../constants/EndpointDirectory';
import configService from '../../service/configService';
import { IplayarrParameter } from '../../types/IplayarrParameters';
import { ApiError } from '../../types/responses/ApiResponse';
import { createApiShim } from '../../utils/expressShim';

interface ApiRequest {
    apikey: string;
    mode?: string;
    t?: string;
}

// Parity: original ApiRoute `router.all('/', upload.any(), ...)`. Matches all
// methods; multer().any() is replicated inside createApiShim. Dispatch by
// `mode` (SabNZBD) or `t` (NewzNab) to the endpoint directory.
export default defineEventHandler(async (event) => {
    const { req, res, done } = await createApiShim(event);
    const { apikey: queryKey, mode, t } = req.query as ApiRequest;
    const envKey: string | undefined = await configService.getParameter(IplayarrParameter.API_KEY);
    if (envKey && envKey == queryKey) {
        const endpoint: string | undefined = mode || t;
        const directory: EndpointDirectory = mode ? SabNZBDEndpointDirectory : NewzNabEndpointDirectory;
        if (endpoint && directory[endpoint]) {
            await directory[endpoint](req, res, (() => {}) as any);
        } else {
            res.status(404).json({ error: ApiError.API_NOT_FOUND } as any);
        }
    } else {
        res.status(401).json({ error: ApiError.NOT_AUTHORISED } as any);
    }
    return done();
});
