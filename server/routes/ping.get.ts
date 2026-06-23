import { redis } from '../service/redis/redisService';

// Parity: original `app.get('/ping', ...)` healthcheck (unauthenticated).
export default defineEventHandler(async (event) => {
    try {
        await redis.ping();
        return { status: 'OK' };
    } catch (error: any) {
        setResponseStatus(event, 503);
        return { status: 'ERROR', message: `Redis error - ${error?.message}` };
    }
});
