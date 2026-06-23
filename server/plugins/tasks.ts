import type { NitroApp } from 'nitropack';

import taskService from '../service/taskService';

// Parity: original server.ts called taskService.init() at startup to register
// the node-cron refresh job. Single-process deployment assumed (confirmed).
export default defineNitroPlugin((_nitroApp: NitroApp) => {
    taskService.init();
});
