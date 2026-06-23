import { version } from '../../../config/version.json';

export default defineEventHandler(() => {
    return {
        HIDE_DONATE: Boolean(process.env.HIDE_DONATE) || false,
        VERSION: version,
    };
});
