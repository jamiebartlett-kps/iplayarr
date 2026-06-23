import configService, { ConfigMap } from '../../../service/configService';

export default defineEventHandler(async () => {
    const configMap: ConfigMap = await configService.getAllConfig();
    return configMap;
});
