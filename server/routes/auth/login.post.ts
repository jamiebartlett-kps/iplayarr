import configService from '../../service/configService';
import { IplayarrParameter } from '../../types/IplayarrParameters';
import { ApiError } from '../../types/responses/ApiResponse';
import { comparePassword, hashPassword, isLegacyMD5Hash, md5 } from '../../utils/Utils';
import { getIpSession } from '../../utils/session';

export default defineEventHandler(async (event) => {
    const [AUTH_USERNAME, AUTH_PASSWORD] = await Promise.all([
        configService.getParameter(IplayarrParameter.AUTH_USERNAME),
        configService.getParameter(IplayarrParameter.AUTH_PASSWORD),
    ]);
    const { username, password } = await readBody(event);

    if (username !== AUTH_USERNAME || !AUTH_PASSWORD) {
        setResponseStatus(event, 401);
        return { error: ApiError.INVALID_CREDENTIALS };
    }

    let passwordValid = false;

    if (isLegacyMD5Hash(AUTH_PASSWORD)) {
        // Stored password is a legacy MD5 hash — compare with MD5, then migrate to bcrypt
        passwordValid = md5(password) === AUTH_PASSWORD;
        if (passwordValid) {
            const bcryptHash = await hashPassword(password);
            await configService.setParameter(IplayarrParameter.AUTH_PASSWORD, bcryptHash);
        }
    } else {
        // Stored password is a bcrypt hash
        passwordValid = await comparePassword(password, AUTH_PASSWORD);
    }

    if (passwordValid) {
        const session = await getIpSession(event);
        await session.update({ user: { username } });
        return { status: true };
    }

    setResponseStatus(event, 401);
    return { error: ApiError.INVALID_CREDENTIALS };
});
