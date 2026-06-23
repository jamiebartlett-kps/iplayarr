jest.mock('dotenv');
jest.mock('ioredis', () => jest.requireActual('ioredis-mock'));

// Expose h3/Nitro auto-imported helpers (defineEventHandler, getQuery, readBody,
// setResponseStatus, getRouterParam, ...) as globals so the server/ route
// handlers — which rely on Nitro auto-imports and never import them — can be
// loaded and exercised in Jest exactly as Nitro provides them at runtime.
Object.assign(globalThis, require('h3'));

beforeEach(() => {
    jest.clearAllMocks();
});
