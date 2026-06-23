import { sqlite } from '../db';

// Parity: original `/ping` healthcheck. Now checks the SQLite store (the
// authoritative persistence layer) rather than Redis (which is optional).
export default defineEventHandler(async (event) => {
    try {
        sqlite.prepare('SELECT 1').get();
        return { status: 'OK' };
    } catch (error: any) {
        setResponseStatus(event, 503);
        return { status: 'ERROR', message: `Database error - ${error?.message}` };
    }
});
