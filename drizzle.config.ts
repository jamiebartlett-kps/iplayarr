import { defineConfig } from 'drizzle-kit';

// Used by drizzle-kit for generating SQL migrations / studio during development.
// At runtime the schema is created idempotently via ensureSchema() in
// server/db/index.ts (no migration files are bundled into the Nitro output).
export default defineConfig({
    dialect: 'sqlite',
    schema: './server/db/schema.ts',
    out: './server/db/migrations',
    dbCredentials: {
        url: process.env.DATABASE_PATH || './data/iplayarr.db',
    },
});
