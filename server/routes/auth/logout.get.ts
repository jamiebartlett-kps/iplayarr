import { getIpSession } from '../../utils/session';

export default defineEventHandler(async (event) => {
    const session = await getIpSession(event);
    await session.clear();
    return { status: true };
});
