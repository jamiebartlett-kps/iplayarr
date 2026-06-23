import configService from '../../service/configService';
import { IplayarrParameter } from '../../types/IplayarrParameters';
import { clearResetToken, getResetToken } from '../../utils/resetToken';

export default defineEventHandler(async (event) => {
    const { key } = await readBody(event);

    const token = getResetToken();
    if (token != '' && key == token) {
        clearResetToken();
        await configService.setParameter(IplayarrParameter.AUTH_USERNAME, configService.defaultConfigMap.AUTH_USERNAME);
        await configService.setParameter(IplayarrParameter.AUTH_PASSWORD, configService.defaultConfigMap.AUTH_PASSWORD);
        await configService.setParameter(IplayarrParameter.AUTH_TYPE, configService.defaultConfigMap.AUTH_TYPE);
    }

    return { status: true };
});
