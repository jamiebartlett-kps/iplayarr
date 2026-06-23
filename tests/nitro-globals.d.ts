// Ambient declarations for the h3/Nitro auto-imported helpers that the server/
// route handlers use without importing. At runtime these are provided by Nitro
// (and, under Jest, by tests/setup.ts via Object.assign(globalThis, h3)). This
// file lets ts-jest type-check the handlers without Nitro's generated types.
import type * as h3 from 'h3';

declare global {
    const defineEventHandler: typeof h3.defineEventHandler;
    const useSession: typeof h3.useSession;
    const getQuery: typeof h3.getQuery;
    const readBody: typeof h3.readBody;
    const readMultipartFormData: typeof h3.readMultipartFormData;
    const getRouterParam: typeof h3.getRouterParam;
    const getHeader: typeof h3.getHeader;
    const setResponseStatus: typeof h3.setResponseStatus;
    const setResponseHeader: typeof h3.setResponseHeader;
    const getResponseHeader: typeof h3.getResponseHeader;
    const sendRedirect: typeof h3.sendRedirect;
    const getRequestHost: typeof h3.getRequestHost;
    const getRequestProtocol: typeof h3.getRequestProtocol;
    const getRequestURL: typeof h3.getRequestURL;
}

export {};
