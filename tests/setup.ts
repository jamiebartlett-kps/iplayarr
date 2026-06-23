jest.mock('dotenv');

// Expose h3/Nitro auto-imported helpers (defineEventHandler, getQuery, readBody,
// setResponseStatus, getRouterParam, ...) as globals so the server/ route
// handlers — which rely on Nitro auto-imports and never import them — can be
// loaded and exercised in Jest exactly as Nitro provides them at runtime.
Object.assign(globalThis, require('h3'));

// SQLite test DB: DATABASE_PATH=:memory: is set by the test script, so this
// creates a fresh in-memory database per test file. Tables are created once and
// cleared before each test for isolation.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ensureSchema, sqlite } = require('../server/db');
ensureSchema();

const TABLES = [
    'config',
    'apps',
    'synonyms',
    'history',
    'search_history',
    'grab_history',
    'episode_cache_definitions',
    'episode_cache',
    'meta',
];

beforeEach(() => {
    jest.clearAllMocks();
    for (const table of TABLES) {
        sqlite.exec(`DELETE FROM ${table};`);
    }
});
