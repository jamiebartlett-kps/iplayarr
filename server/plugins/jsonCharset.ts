import { getResponseHeader, setResponseHeader } from 'h3';
import type { NitroApp } from 'nitropack';

// Parity: Express res.json() sets "application/json; charset=utf-8". Nitro emits
// "application/json" (no charset) for returned objects, so append the charset to
// match the original API contract. The /api shim and XML endpoints already set
// their own charset, so they are left untouched.
export default defineNitroPlugin((nitroApp: NitroApp) => {
    nitroApp.hooks.hook('beforeResponse', (event, response) => {
        const ct = getResponseHeader(event, 'content-type');
        const body = (response as any)?.body;
        // Nitro sets "application/json" when serializing object/array bodies after
        // this hook; pre-set the charset so the final header matches Express.
        if (!ct && body !== null && typeof body === 'object') {
            setResponseHeader(event, 'content-type', 'application/json; charset=utf-8');
        } else if (ct === 'application/json') {
            setResponseHeader(event, 'content-type', 'application/json; charset=utf-8');
        }
    });
});
