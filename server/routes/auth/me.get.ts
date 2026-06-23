import configService from '../../service/configService';
import { IplayarrParameter } from '../../types/IplayarrParameters';
import { ApiError } from '../../types/responses/ApiResponse';
import { getIpSession } from '../../utils/session';

export default defineEventHandler(async (event) => {
    const [authType, username] = await Promise.all([
        configService.getParameter(IplayarrParameter.AUTH_TYPE),
        configService.getParameter(IplayarrParameter.AUTH_USERNAME),
    ]);
    const session = await getIpSession(event);
    if (authType == 'none') {
        await session.update({ user: { username: username || 'admin' } });
    }
    if (!session.data.user) {
        setResponseStatus(event, 401);
        return { error: ApiError.NOT_AUTHORISED };
    } else {
        return session.data.user;
    }
});
