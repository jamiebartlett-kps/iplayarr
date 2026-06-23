import type { NitroApp } from 'nitropack';

import { ensureSchema } from '../db';
import { migrateFromRedis } from '../db/migrateFromRedis';
import StatisticsService from '../service/stats/StatisticsService';

// Runs first (filename prefix '0.') so the SQLite schema exists before any other
// plugin (socket.io connection emits, cron) or request touches the database.
export default defineNitroPlugin(async (_nitroApp: NitroApp) => {
    ensureSchema();
    await migrateFromRedis();
    await StatisticsService.setUptime();
});
