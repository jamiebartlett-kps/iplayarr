import { generateResetToken } from '../../utils/resetToken';

export default defineEventHandler(() => {
    generateResetToken();
    return { status: true };
});
