import { createServer, type Server } from 'node:http';

import { type App, createApp, createRouter, type EventHandler, type Router, toNodeListener } from 'h3';

// Builds a throwaway Node server from h3 route handlers so the ported Nitro
// handlers can be exercised with supertest, mirroring how the original Express
// route tests mounted a router. Dynamic segments use h3 syntax (/x/:id).
export function h3Server(register: (router: Router, app: App) => void): Server {
    const app = createApp();
    const router = createRouter();
    register(router, app);
    app.use(router);
    return createServer(toNodeListener(app));
}

export type { EventHandler };
