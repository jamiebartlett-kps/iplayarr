# iPlayarr — Nuxt migration working notes (CLAUDE.md / AGENTS.md)

This repository is mid-migration from a **Vue 3 SPA (`frontend/`) + Express/TS API (`src/`)**
into a **single Nuxt 4 application**. The authoritative plan, inventory, route/API
mapping tables, and decision log live in **`docs/plans/v1-nuxt-migration.md`** — read it first.

## Non-negotiable goal
Strict **1:1 feature, UI, and API parity** with the original. Do not "improve",
refactor, rename, or fix apparent bugs unless explicitly approved — preserve behavior,
including quirks (see the Decision Log in the plan).

## Confirmed architectural decisions
- **Backend:** full port of Express routes to **h3/Nitro** handlers under `server/`.
- **Rendering:** **SSR enabled** (`ssr: true`), but **all data fetching stays client-side**
  (in `onMounted`/`watch`/event handlers) to match the original SPA timing. Guard all
  browser-only code (`window`, `BroadcastChannel`, Socket.IO) with `import.meta.client`.
- **Layout:** repo restructured **in place**. Originals in `src/` and `frontend/` remain
  until each slice is verified, then removed in the final cleanup phase.
- **Sessions:** h3 sessions backed by ioredis; a one-time re-login on deploy is accepted.
- **Deployment:** single process (in-memory Socket.IO registry + cron assume this).
- **PWA:** via `@vite-pwa/nuxt`.
- **Unknown routes:** preserve the original "blank shell" via `app/pages/[...slug].vue`.

## Target structure (Nuxt 4 `app/` srcDir)
```
nuxt.config.ts          Nuxt config (ssr, modules, less injection, head, pwa)
app/
  app.vue               <NuxtLayout><NuxtPage/></NuxtLayout>
  router.options.ts     scrollBehavior parity
  layouts/default.vue   shell: NavBar + main-layout + LeftHandNav + ModalsContainer
  pages/                file-based routes (see mapping table in the plan)
  components/           ported from frontend/src/components (same tree)
  composables/          replace App.vue provide/inject (useAuthState, useQueue, useSocket, …)
  plugins/              fontawesome, vue-final-modal, apexcharts (client plugins)
  middleware/           auth.global.ts (ported from router.beforeEach, client-side)
  assets/styles/        variables.less + global.less (ported)
  lib/                  ipFetch, utils, dialogService (ported)
server/
  routes/               h3 handlers preserving exact paths (/auth, /api, /json-api, /ping)
  middleware/           /json-api auth gate (path-scoped)
  plugins/              socket.io attach, cron init
  services|facade|endpoints|types|validators|constants|utils  (ported from src/, logic verbatim)
public/                 favicon, icons, img, shortcuts (ported from frontend/public)
```

## Mapping conventions
- **Frontend route → page:** dynamic `:id` → `[id].vue`, catch-all `*` → `[...slug].vue`,
  named routes via `definePageMeta({ name })`. See the plan's route table.
- **Data client:** `app/lib/ipFetch.ts` keeps the `{ data, ok }` shape and
  `credentials: 'include'`. `getHost()` returns `''` (same-origin) now that FE+BE are unified.
- **State:** the original `provide`/`inject` (`authState`, `queue`, `history`, `logs`,
  `socket`, `hiddenSettings`, `globalSettings`, …) become composables backed by
  `useState` so they are shared app-wide; behavior must match `App.vue`.
- **Express → h3:** `req.query`→`getQuery`, `req.body`→`readBody`, `req.params`→`getRouterParam`,
  `res.json(x)`→`return x`, `res.status(n).json(x)`→`setResponseStatus(event,n)`+`return x`,
  `res.set(h).send(x)`→`setHeader`+`return x`, `res.redirect`→`sendRedirect`. Method via
  filename suffix (`.get.ts`/`.post.ts`/…); `router.all` → single handler with method checks.
- **Error envelope:** preserve exactly `{ error, invalid_fields?, message? }` and status codes.

## Build / run / test
- `npm run dev` — Nuxt dev server.
- `npm run build` && `npm run start` — production (`node .output/server/index.mjs`). Honors `PORT` (default 4404 in Docker).
- `npm test` — Jest (ts-jest). NOTE: `jest.config.cjs` (package is `"type":"module"`).
  Tests still target `src/`; they are ported to `server/` as routes/services migrate.
- The original backend `tsconfig.json` (CommonJS) is retained for ts-jest during the
  transition; Nuxt uses its generated `.nuxt/tsconfig.json`.

## Status
- ✅ Phase 1 — plan committed (`docs/plans/v1-nuxt-migration.md`).
- ✅ Phase 2 — scaffold (nuxt.config, app shell, assets, PWA; builds clean).
- ✅ Phase 3 — backend core services/facades/types in `server/`; socket.io + cron
  plugins; `/ping`. Server boots; verified.
- ✅ Phase 4 — auth & sessions (h3 `useSession`, `/auth/*`, json-api gate, OIDC).
  Login/logout/me/gate/none verified end-to-end.
- ✅ Phase 5 — `/api` endpoints (newznab/sabnzbd) via Express-compat shim;
  caps/version/config/queue/history/nzb-download/404/401 verified.
- ✅ Phase 6 — `/json-api/*` endpoints (config/apps/synonym/offSchedule/queue/
  stats + loose handlers); JSON charset header fixed; verified.
- ✅ Phase 7 — frontend: `app.vue` (App.vue port, ClientOnly), plugins, auth
  middleware, lib, 35 components + 12 pages. Builds; app serves.
- ✅ Phase 8 — Docker/CI point at the Nuxt build.
- 🔚 Parity report: `docs/plans/v1-parity-report.md`. Remaining: browser UI walk,
  live OIDC/search/integration checks, port route/endpoint tests then delete
  `src/` + `frontend/`.

The legacy `src/` (Express) and `frontend/` (Vue SPA) are intentionally retained
for now: the Jest suite (367 tests) still targets them. Build & runtime use only
the Nuxt app (`nuxt.config.ts`, `app/`, `server/`).
