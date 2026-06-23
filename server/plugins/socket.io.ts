import { Server as Engine } from 'engine.io';
import { defineEventHandler } from 'h3';
import type { NitroApp } from 'nitropack';
import { Server } from 'socket.io';

import socketService from '../service/socketService';

// Parity: original server.ts attached socket.io to the HTTP server and called
// socketService.registerIo(io). Nitro has no raw http.Server, so we bind an
// engine.io instance to the Nitro router (HTTP long-polling path) and to the
// crossws websocket hook. socket.io-client transparently falls back to polling
// if the websocket upgrade is unavailable, so realtime parity is preserved.
export default defineNitroPlugin((nitroApp: NitroApp) => {
    const engine = new Engine();
    const io = new Server();

    io.bind(engine);

    // Reuse the existing connection logic (initial queue/history + log replay).
    socketService.registerIo(io);

    nitroApp.router.use(
        '/socket.io/',
        defineEventHandler({
            handler(event) {
                // @ts-expect-error engine.io accepts the node req/res directly
                engine.handleRequest(event.node.req, event.node.res);
                event._handled = true;
            },
            websocket: {
                open(peer) {
                    try {
                        // @ts-expect-error crossws node context
                        const nodeContext = peer.ctx?.node ?? peer._internal?.nodeContext;
                        const req = nodeContext.req;

                        // @ts-expect-error private engine.io method
                        engine.prepare(req);

                        const rawSocket = req.socket;
                        const websocket = nodeContext.ws;

                        // @ts-expect-error private engine.io method
                        engine.onWebSocket(req, rawSocket, websocket);
                    } catch (err) {
                        // Non-fatal: client falls back to HTTP long-polling.
                        console.error('socket.io websocket upgrade failed, falling back to polling:', err);
                    }
                },
            },
        })
    );
});
