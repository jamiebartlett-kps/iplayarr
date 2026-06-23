import configService from '../service/configService';
import { IplayarrParameter } from '../types/IplayarrParameters';
import { ApiError } from '../types/responses/ApiResponse';
import { getIpSession } from '../utils/session';

// Parity: original `app.use('/json-api/*', ...)` auth gate. h3 middleware runs
// on every request, so we early-return for non /json-api paths to scope it to
// the same routes as the Express version.
export default defineEventHandler(async (event) => {
    if (!event.path.startsWith('/json-api')) {
        return;
    }

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
    }
});
