# v1 — Nuxt Migration Plan (Vue + Express → Nuxt)

**Status:** Phase 1 — awaiting approval. No application code has been written.
**Goal:** Migrate the existing Vue 3 SPA (`frontend/`) + Express/TypeScript API (`src/`) into a single Nuxt application with **strict 1:1 feature and UI/API parity**.

---

## 0. Confirmed architectural decisions

These were chosen by the project owner, overriding the defaults proposed in the migration brief. Each override increases parity risk relative to the recommended option; mitigations are recorded in the [Decision Log](#4-decision-log).

| # | Decision | Chosen | Recommended default | Risk |
|---|----------|--------|---------------------|------|
| D1 | Backend strategy | **Full port to h3/Nitro handlers** | Mount Express under Nitro | High — every endpoint is a fresh parity surface |
| D2 | Rendering mode | **SSR enabled** | SPA (`ssr: false`) | High — changes when/where data fetching runs; browser-only code (Socket.IO, `window`, `BroadcastChannel`) must be guarded |
| D3 | Repo layout | **Restructure in place** | New `nuxt/` dir alongside | Medium — no side-by-side comparison; rollback via git only |
| D4 | Dependencies | No new deps beyond Nuxt + required modules unless a like-for-like is unavailable | (same) | — |
| D5 | Package manager / Node | npm; Node 23 (`.node-version`) | (same) | — |

---

## 1. Phase 0 — Inventory

### 1.1 Frontend (`frontend/`)

- **Stack:** Vue 3.2, `@vue/cli-service` (Webpack), `vue-router@4`, Less, PWA plugin, FontAwesome, `vue-final-modal@4`, `vue3-apexcharts`, `socket.io-client`.
- **Entry (`src/main.js`):** `createApp(App)`; provides reactive `authState = { user: null }`; registers `createVfm()` (vue-final-modal), `VueApexCharts`, global component `FontAwesomeIcon`, the router; imports `./registerServiceWorker` and `vue-final-modal/style.css`; `library.add(fas, fab)`.
- **Root (`src/App.vue`):** shell = `<NavBar>` + `.main-layout` ( `<LeftHandNav v-if="authState.user">` + `.content > <RouterView>` ) + `<ModalsContainer>`. On `authState.user` (watch, immediate) runs `pageSetup()`: scroll reset, `updateQueue()` (fetch `json-api/queue/queue` + `json-api/queue/history`), opens Socket.IO (`io()` prod / `io(http://<hostname>:4404)` dev), subscribes to `queue`/`history`/`log`, fetches `json-api/config/hiddenSettings` + `json-api/config`. **Provides:** `queue`, `history`, `socket`, `logs`, `hiddenSettings`, `globalSettings`, `updateQueue`, `toggleLeftHandNav`, `refreshGlobalSettings`.
- **Router (`src/router/router.js`):** `createWebHistory`, `scrollBehavior` → `{ top: 0 }`. Global `beforeEach`: skip `/login`; else `fetch(<host>/auth/me, { credentials: 'include' })` → set `authState.user` & continue, else `authState.user = null` and redirect `/login`. **Note: the guard calls `inject('authState')` outside setup — works only incidentally; preserve behavior exactly.**

**Vue Router routes:**

| Path | Name | Component | Notes |
|------|------|-----------|-------|
| `/` | — | redirect → `/queue` | |
| `/queue` | — | `QueuePage` | |
| `/info` | `queueInfo` | `QueueInfoPage` | reads `query.item` (JSON string) |
| `/logs` | — | `LogsPage` | reads `query.filter` |
| `/about` | — | `AboutPage` | |
| `/settings` | — | `SettingsPage` | `onBeforeRouteLeave` unsaved-changes guard |
| `/synonyms` | — | `SynonymsPage` | |
| `/login` | — | `LoginPage` | unauthenticated |
| `/search` | `search` | `SearchPage` | reads `query.searchTerm` |
| `/download` | `download` | `DownloadPage` | reads `query.json` (JSON string) |
| `/offSchedule` | — | `OffSchedulePage` | |
| `/apps` | — | `AppsPage` | |
| `/stats` | — | `StatisticsPage` | |

- **No catch-all route** in the Vue router (unknown paths fall through to vue-router default = no match). Express serves `index.html` for any non-API path.
- **State management:** No Vuex/Pinia. Reactive `authState` (provided in `main.js`) + refs provided by `App.vue` + route query + component-local state.
- **Data-fetching client:** `lib/ipFetch.js` — `fetch(<host>/<endpoint>, { method, credentials: 'include', headers: JSON when body })` → `{ data: await res.json(), ok }`. Plus raw `fetch` for `/auth/me` in the guard and form-POST for OIDC test. `lib/utils.js#getHost()` → `http://<hostname>:4404` in non-prod, `''` in prod.
- **Socket.IO client:** single connection in `App.vue`; events `queue`, `history`, `log`; plus `app_update_status` in `UpdateAppDialog.vue`.
- **Views (per-view fetch timing & endpoints):**
  - `AboutPage` — static; injects `hiddenSettings` (VERSION, HIDE_DONATE); device detection via `navigator.userAgent`.
  - `AppsPage` — `onMounted`: `GET json-api/apps`, `GET json-api/apps/types`; `DELETE json-api/apps`; AppForm modal.
  - `DownloadPage` — `watch(route.query.json)` parse; `GET json-api/download?pid&nzbName&type`; `router.push('/queue')`.
  - `LoginPage` — `onMounted`: `GET auth/me`, `GET auth/method`; `POST auth/login`; `GET auth/oidc/login` (redirect); `POST auth/generateToken`; `POST auth/resetPassword`; `router.push('/queue')`.
  - `LogsPage` — uses injected `logs`; reads `route.query.filter`; `LogPanel`.
  - `OffSchedulePage` — `onMounted`: `GET json-api/offSchedule`; `POST/PUT/DELETE json-api/offSchedule`; `POST json-api/offSchedule/refresh`; `router.push(/search?searchTerm=)`.
  - `QueueInfoPage` — `watch(route.query.item)` parse; `DELETE json-api/queue/queue?pid`; `MediaInfoHero` + `LogPanel`.
  - `QueuePage` — `onMounted`: `GET json-api/apps`; injected `queue`/`history`; bulk `DELETE json-api/queue/queue?pid` & `json-api/queue/history?pid`.
  - `SearchPage` — `watch(route.query.searchTerm)`: `GET json-api/search?q`; `GET json-api/download`; navigate to `download` route.
  - `SettingsPage` — `onMounted`: `GET json-api/config`, `GET json-api/config/qualityProfiles`; `PUT json-api/config`; `POST auth/generateToken`; `POST json-api/apps/updateApiKey`; OIDC test via form-POST to `<host>/auth/oidc/test` in popup + `BroadcastChannel('oidc-test')`; `onBeforeRouteLeave` guard.
  - `StatisticsPage` — `onMounted` + 3-min interval: `GET json-api/stats/searchHistory` (`?filterRss`), `grabHistory`, `GET json-api/apps`, `stats/uptime`, `stats/cacheSizes`; ApexCharts; 1s uptime counter.
  - `SynonymsPage` — `onMounted`: `GET json-api/synonym`; `POST/PUT/DELETE json-api/synonym`; import wizard (AppSelectDialog → ArrLookupDialog → SynonymForm); `getCleanSceneTitle`.
- **Components:** `common/` (NavBar, LeftHandNav, NavLink, InfoBar, ListEditor, LoadingIndicator, ProgressBar, MediaInfoHero, SettingsPageToolbar), `common/form/` (TextInput, SelectInput, CheckInput, TagInput), `charts/` (LineChart, PieChart, PolarArea), `log/LogPanel`, `queue/` (QueueTable, QueueTableRow), `modals/` (IPlayarrModal, AlertDialog, AppForm, AppSelectDialog, ArrLookupDialog, OffScheduleForm, SearchHistoryDialog, SynonymForm, UpdateAppDialog), `apps/AppTestButton`.
- **Modals:** `lib/dialogService.js` (`alert`/`confirm`/`select` → promises via `useModal()` + `AlertDialog`).
- **Styling:** `assets/styles/variables.less` + `global.less` auto-injected into every SFC via `vue.config.mjs` `css.loaderOptions.less.additionalData`. Dark theme, brand `rgb(225,31,119)`, `.pill`, `.iplayarr-modal*`, Roboto font, `@mobile-breakpoint: 768px`.
- **PWA / SW:** `registerServiceWorker.js` (prod only, `register-service-worker`); `vue.config.mjs` `pwa` block (name iPlayarr, themeColor #202020, etc.); `public/index.html` head (title iPlayarr, favicon, apple-touch-icon, viewport `user-scalable=no`).
- **Frontend env vars:** `process.env.NODE_ENV` (socket URL, SW gate, `getHost`), `process.env.BASE_URL` (SW path). All app config is fetched from the API, not env.

### 1.2 Backend (`src/`)

- **Bootstrap (`server.ts`) middleware order (critical):** (1) CORS *(debug only)*, (2) `express.urlencoded({extended:true})`, (3) `express.json()`, (4) `addAuthMiddleware(app)` = `express-session`(RedisStore, prefix `iplayarr:`) **then** `/json-api/*` auth gate, (5) `/auth` router, (6) `GET /ping` (Redis health), (7) `express.static(frontend/dist)`, (8) debug request logger, (9) `/api` router, (10) `/json-api` router, (11) `GET *` → `index.html`. Then HTTP server + Socket.IO (`io` CORS open in debug). `taskService.init()` (cron).
- **Auth/session (`AuthRoute.ts`):** `express-session` secret `SESSION_SECRET||'default_secret_key'`, `resave:false`, `saveUninitialized:false`, cookie `{secure:false, maxAge:86400000, sameSite:'lax' (debug only)}`, store=RedisStore. `/json-api/*` gate: if `AUTH_TYPE==none` set `session.user`; else 401 `{error: NOT_AUTHORISED}` when no user. Session shape `{ user, codeVerifier?, state? }`.
- **OIDC (`service/auth/OIDCService.ts`):** `openid-client` v6 (`discovery`, PKCE `randomPKCECodeVerifier`/`calculatePKCECodeChallenge`, `buildAuthorizationUrl`, `authorizationCodeGrant`, `fetchProtectedResource`). Sets `session.codeVerifier`/`state`; callback redirects (`/queue` or popup HTML for test) and validates against `OIDC_ALLOWED_EMAILS`.
- **Config (`service/configService.ts`):** Redis-backed (`QueuedStorage`, key `config`); resolution Redis → `process.env` → `defaultConfigMap`. `dotenv.config()`. `IplayarrParameter` enum (PORT, API_KEY, AUTH_TYPE/USERNAME/PASSWORD, OIDC_*, DOWNLOAD_*, *_FILENAME_TEMPLATE, REFRESH_SCHEDULE, NATIVE_SEARCH, ARCHIVE_ENABLED, OUTPUT_FORMAT, …).
- **Socket.IO (`service/socketService.ts`):** default namespace; on connect emits initial `queue` + `history`; broadcast events `queue` (`QueueEntry[]`), `history` (`QueueEntry[]`), `log` (`LogLine`), `app_update_status` (`{id,status,message?}`).
- **Cron (`service/taskService.ts`):** `REFRESH_SCHEDULE` (default `0 * * * *`) → `scheduleFacade.refreshCache()`; if `NATIVE_SEARCH=false` also `recacheAllSeries()` + `cleanupFailedDownloads()`.
- **Subprocess:** get_iplayer / yt-dlp executed by download/search/schedule services (env `GET_IPLAYER_EXEC`, `YTDLP_EXEC`, `CACHE_LOCATION`, etc.).
- **Backend env vars:** `DEBUG`, `PORT`, `SESSION_SECRET`, `HIDE_DONATE`, `REDIS_HOST/PORT/PASSWORD/SSL`, `NODE_ENV`, `LOG_DIR`, `STORAGE_LOCATION`, `CACHE_LOCATION`, `GET_IPLAYER_EXEC`, `YTDLP_EXEC`, `GET_IPLAYER_VERSION`.
- **HTML responses:** none via templating engines; the only inline HTML is the OIDC-test popup string in `AuthRoute.ts`. SPA served via static + `GET *`.
- **Swagger:** `src/swagger/swagger.json` exists as a static reference; **not** served by any route.
- **Tests:** Jest + ts-jest + supertest; coverage over `src/**`; suites for every endpoint, route, facade, and service (`tests/`).

---

## 2. Frontend route mapping (Vue Router → Nuxt `pages/`)

Nuxt file-based routing under `pages/`. SSR enabled (D2) — all data-fetch call sites that use browser globals must be guarded (`import.meta.client` / `onMounted`) to keep timing identical to the SPA.

| Vue route | Name | Nuxt file | Notes |
|-----------|------|-----------|-------|
| `/` redirect `/queue` | — | `middleware`/`pages/index.vue` | reproduce redirect; simplest = `pages/index.vue` with `navigateTo('/queue')` (client) or route rule |
| `/queue` | — | `pages/queue.vue` | |
| `/info` | `queueInfo` | `pages/info.vue` | `definePageMeta({ name: 'queueInfo' })`; `useRoute().query.item` |
| `/logs` | — | `pages/logs.vue` | `query.filter` |
| `/about` | — | `pages/about.vue` | |
| `/settings` | — | `pages/settings.vue` | unsaved-changes guard via `onBeforeRouteLeave` |
| `/synonyms` | — | `pages/synonyms.vue` | |
| `/login` | — | `pages/login.vue` | excluded from auth middleware |
| `/search` | `search` | `pages/search.vue` | `definePageMeta({ name: 'search' })`; `query.searchTerm` |
| `/download` | `download` | `pages/download.vue` | `definePageMeta({ name: 'download' })`; `query.json` |
| `/offSchedule` | — | `pages/offSchedule.vue` | |
| `/apps` | — | `pages/apps.vue` | |
| `/stats` | — | `pages/stats.vue` | |

- **Auth guard** `router.beforeEach` → `middleware/auth.global.ts`: skip `/login`; else `$fetch('/auth/me', { credentials: 'include' })`; set shared auth state; redirect `/login` on failure. Must run client-side to match SPA timing (SSR has no browser cookies the same way → guard runs on client; see Decision Log D2/D6).
- **`scrollBehavior`** `{ top: 0 }` → Nuxt `app/router.options.ts`.
- **Layout:** `App.vue` shell → `layouts/default.vue` (NavBar + main-layout + LeftHandNav + ModalsContainer) so wrapping markup is identical. `app.vue` = `<NuxtLayout><NuxtPage/></NuxtLayout>`.
- **Global setup (`main.js`)** → `nuxt.config.ts` + `plugins/`: FontAwesome (`plugins/fontawesome.client.ts` or registered global), vue-final-modal (`plugins/vfm.ts` + CSS in config), vue3-apexcharts (`plugins/apexcharts.client.ts`), `authState`/provides → composables (`useAuthState`, `useQueue`, `useSocket`, etc.) or a Nuxt plugin providing the same injection keys.

---

## 3. API mapping (Express → Nitro h3 handlers, per D1 full port)

Routing base preserved exactly (`/auth`, `/api`, `/json-api`, `/ping`). Nitro server routes live under `server/routes/` (to keep exact non-`/api`-prefixed and custom paths) rather than `server/api/` (which forces an `/api` prefix). Method via filename suffix (`.get.ts`/`.post.ts`/`.put.ts`/`.delete.ts`) where 1:1; combined-method endpoints use a single handler with explicit method checks (matching Express `router.all`).

### 3.1 Auth (`/auth/*`) — `server/routes/auth/`

| Express | Method | Nitro file | h3 notes |
|---------|--------|-----------|----------|
| `/auth/method` | GET | `method.get.ts` | `getParameter(AUTH_TYPE)` → `{message}` |
| `/auth/oidc/login` | GET | `oidc/login.get.ts` | 400 if not oidc; else `{url}` |
| `/auth/oidc/test` | POST | `oidc/test.post.ts` | `readBody`; `sendRedirect` |
| `/auth/oidc/callback` | GET | `oidc/callback.get.ts` | `getQuery`; session `codeVerifier`/`state`; HTML popup for test; `sendRedirect('/queue')` |
| `/auth/login` | POST | `login.post.ts` | `readBody`; bcrypt/legacy-MD5; set session user; identical 401 body |
| `/auth/logout` | GET | `logout.get.ts` | clear session → `{status:true}` |
| `/auth/me` | GET | `me.get.ts` | none→`AUTH_TYPE` shortcut; 401 or `session.user` |
| `/auth/generateToken` | GET | `generateToken.get.ts` | in-memory token + 5-min timer (module-level state) |
| `/auth/resetPassword` | POST | `resetPassword.post.ts` | `readBody`; reset config defaults |

- **Session:** `express-session`+`connect-redis` reimplemented with h3 sessions backed by `ioredis`, **reproducing the same cookie name/options** (`connect.sid`, `secure:false`, `maxAge`, `sameSite:'lax'` in debug) and the `iplayarr:` Redis key prefix and stored value shape, so existing sessions keep working. Flagged in Decision Log (D7).
- **`/json-api/*` auth gate** → `server/middleware/auth.ts` scoped to paths starting `/json-api` (h3 middleware runs on every request; must early-return for non-`/json-api`).

### 3.2 Indexer/Downloader API (`/api`) — `server/routes/api/index.ts`

Single handler replicating `ApiRoute.all('/')`: validate `apikey` vs `API_KEY` (401 body identical), dispatch by `mode` (`SabNZBDEndpointDirectory`) or `t` (`NewzNabEndpointDirectory`), else 404 `{error: API_NOT_FOUND}`.

| Dispatch key | Source | Method | Response | h3 notes |
|--------------|--------|--------|----------|----------|
| `t=caps` | newznab Caps | GET | XML `application/xml` | byte-identical XML builder |
| `t=tvsearch\|movie\|search` | newznab Search | GET | RSS XML | `xml2js.Builder`; records search stats |
| `t/mode=download` | generic Download | GET | `{status:true}` | |
| `mode=version` | sab Version | GET | `{version:'1.0.0'}` | |
| `mode=get_config` | sab Config | GET | `{config}` | |
| `mode=queue` | sab Queue | GET/DELETE | `{queue}` / `{status}` | sub-dispatch by `name` |
| `mode=history` | sab History | GET/DELETE | `{history}` / `{status}` | sub-dispatch by `name` |
| `mode=nzb-download` | sab DownloadNZB | GET | NZB `application/x-nzb` | exact content-type + body |
| `mode=addfile` | sab AddFile | POST | `{status, nzo_ids}` | **multer → `readMultipartFormData`** (D8) |

### 3.3 JSON API (`/json-api/*`) — `server/routes/json-api/`

| Express | Method | Nitro file | Response notes |
|---------|--------|-----------|----------------|
| `/json-api/config/hiddenSettings` | GET | `config/hiddenSettings.get.ts` | `{HIDE_DONATE, VERSION}` |
| `/json-api/config` | GET / PUT | `config/index.get.ts` / `index.put.ts` | ConfigFormValidator; password hashing |
| `/json-api/config/qualityProfiles` | GET | `config/qualityProfiles.get.ts` | |
| `/json-api/synonym` | GET/POST/PUT/DELETE | `synonym/index.{get,post,put,delete}.ts` | returns full list |
| `/json-api/synonym/lookup/:appId` | GET | `synonym/lookup/[appId].get.ts` | `getRouterParam`; `term` query |
| `/json-api/queue/queue` | GET/DELETE | `queue/queue.{get,delete}.ts` | emits socket `queue` on delete |
| `/json-api/queue/history` | GET/DELETE | `queue/history.{get,delete}.ts` | emits socket `history` on delete |
| `/json-api/offSchedule` | GET/POST/PUT/DELETE | `offSchedule/index.{...}.ts` | OffScheduleFormValidator |
| `/json-api/offSchedule/refresh` | POST | `offSchedule/refresh.post.ts` | |
| `/json-api/apps` | GET/POST/PUT/DELETE | `apps/index.{...}.ts` | AppFormValidator; emits `app_update_status` |
| `/json-api/apps/types` | GET | `apps/types.get.ts` | |
| `/json-api/apps/test` | POST | `apps/test.post.ts` | |
| `/json-api/apps/updateApiKey` | POST | `apps/updateApiKey.post.ts` | |
| `/json-api/stats/searchHistory` | GET | `stats/searchHistory.get.ts` | `limit`,`filterRss` query |
| `/json-api/stats/grabHistory` | GET | `stats/grabHistory.get.ts` | `limit` query |
| `/json-api/stats/uptime` | GET | `stats/uptime.get.ts` | |
| `/json-api/stats/cacheSizes` | GET | `stats/cacheSizes.get.ts` | |
| `/json-api/nzb/test` | POST | `nzb/test.post.ts` | |
| `/json-api/search` | GET | `search.get.ts` | |
| `/json-api/details` | GET | `details.get.ts` | |
| `/json-api/download` | GET | `download.get.ts` | metadata inference branch preserved |
| `/json-api/cache-refresh` | GET | `cache-refresh.get.ts` | |

### 3.4 Cross-cutting

- **`/ping`** → `server/routes/ping.get.ts` (Redis health, 503 on error).
- **Services / facades / endpoints / types / validators / constants:** moved largely as-is into `server/` (e.g. `server/utils/`, `server/services/`), keeping logic byte-identical. Path alias `@/` / `src` reconfigured for Nitro.
- **Socket.IO server:** attached to the Nitro/Node HTTP server via a Nitro plugin (`server/plugins/socket.ts`) using `nitroApp.hooks` / the underlying `node` server, preserving event names/payloads and the connect-time `queue`+`history` emit. (D9)
- **Cron:** `server/plugins/tasks.ts` calls `taskService.init()` once at startup. (D10)
- **`express.static(frontend/dist)` + `GET *`:** replaced by Nuxt's own asset serving + SSR page rendering; the `GET *` SPA fallback is no longer needed (Nuxt handles unknown routes / 404). (D11)
- **Error/response shapes:** every handler reproduces the exact status code + `{ error, invalid_fields?, message? }` envelope. Validators ported verbatim.

---

## 4. Decision Log

> Per operating rule #2, these are the ambiguous/lossy mappings. Items D6–D13 need confirmation or are accepted risks following D1–D3.

- **D1 (Full h3 port).** *Chosen over mounting Express.* Risk: each of ~40 endpoints can diverge subtly (body parsing, header casing, error envelope, XML whitespace). **Mitigation:** port handler bodies verbatim; reuse existing services/facades unchanged; write contract tests asserting old-vs-new equivalence (Phase final).
- **D2 (SSR enabled).** *Chosen over SPA.* The original never server-renders; data fetch happens in `onMounted`/`watch`; auth guard + Socket.IO + `window`/`BroadcastChannel` are browser-only. **Mitigation:** keep all existing fetch timing on the client (no `useAsyncData` at SSR time), guard browser code with `import.meta.client`/`onMounted`, and make the global auth middleware client-side so behavior matches the SPA. **Open question Q1:** Do you want SSR to actually pre-render page HTML (true SSR), or effectively client-only data with SSR runtime available? Recommendation: keep data client-side to preserve parity; confirm.
- **D3 (Restructure in place).** Originals (`src/`, `frontend/`) will be moved/removed as slices land. **Mitigation:** do it on the feature branch with per-slice commits; keep originals until each slice's parity is verified, then delete in a final cleanup slice.
- **D6 (Auth guard under SSR).** `vue-router` `beforeEach` calling `inject()` is technically irregular but works in the SPA. Ported to a Nuxt global middleware running client-side. **Recommendation:** client-side middleware; confirm acceptable that the very first SSR pass renders the layout shell before the client redirect (same as SPA today, which also flashes before redirect).
- **D7 (Sessions: express-session + connect-redis → h3).** No drop-in. **Plan:** implement h3 session backed by `ioredis` reproducing cookie name `connect.sid`, identical options, `iplayarr:` prefix, and stored JSON shape so live sessions survive. **Risk:** signature/serialization format of `express-session` differs from a hand-rolled store → existing cookies could be invalidated on deploy (users re-login once). **Open question Q2:** Is a one-time re-login on deploy acceptable, or must existing session cookies remain valid byte-for-byte? (The latter may require porting `express-session`'s cosign signature + store format exactly, or mounting `express-session` as Nitro middleware — a partial exception to D1.)
- **D8 (multer → h3).** `/api?mode=addfile` uses `multer().any()`. **Plan:** `readMultipartFormData(event)` and adapt to the `Express.Multer.File[]` shape the endpoint expects. Accepted risk: field ordering/edge cases; covered by porting `AddFileEndpoint` tests.
- **D9 (Socket.IO under Nitro).** Nitro has no built-in socket.io. **Plan:** attach `socket.io` `Server` to the underlying Node HTTP server via a Nitro plugin. **Risk:** dev mode (HMR) and the dev CORS-open config; production single-process assumption. **Open question Q3:** confirm single-instance deployment (in-memory socket registry + cron assume one process; horizontal scaling would break both — same limitation as today).
- **D10 (Cron).** `node-cron` started once via server plugin. Accepted; identical schedule.
- **D11 (Static + SPA fallback).** Express `express.static(frontend/dist)` + `GET *` removed in favor of Nuxt. Behavioral note: unknown routes now yield Nuxt's 404 handling rather than serving `index.html`; the SPA today also has no catch-all route so an unknown path renders an empty `<RouterView>`. **Recommendation:** add a Nuxt `pages/[...slug].vue` only if you want to preserve the "blank shell" behavior; otherwise accept Nuxt default 404. Confirm.
- **D12 (Dev ports & `getHost`).** Today FE dev = 8080, BE = 4404, cross-origin with `credentials:'include'` + dev CORS. After unification everything is same-origin on one Nuxt port. **Plan:** `getHost()` → `''` (same-origin) everywhere; `runtimeConfig.public` for any base URL. **Risk:** the OIDC test/callback debug redirects hardcode `:8080`/`:4404` — these must be repointed to the unified port. Flag for review when porting `AuthRoute`.
- **D13 (PWA/service worker).** vue-cli PWA plugin has no direct Nuxt equivalent without a new dep (`@vite-pwa/nuxt`). **Open question Q4:** (a) add `@vite-pwa/nuxt` (one new dep, closest parity to the generated manifest/SW), or (b) hand-port the manifest + a static service worker with no new dep, or (c) drop PWA/offline for v1. Recommendation: (a) if PWA parity matters, else (b).
- **Env vars → runtimeConfig.** All backend env vars → `runtimeConfig` (private); `NODE_ENV`/`BASE_URL` semantics → Nuxt equivalents. `dotenv` handled natively by Nuxt `.env` loading.
- **Preserved quirks (do not "fix"):** `scrollBehavior` typo `behaviour`; `getHost` dev-port hardcode; auth guard `inject` outside setup; `AUTH_TYPE==none` auto-login in both `/json-api` gate and `/auth/me`; `nzbName` `.`/space replacement logic in `/json-api/download`. All carried over verbatim.

---

## 5. Phased implementation order (gated)

Each slice ends with: diff summary, mappings applied, what was verified, then **stop for approval**.

- **Phase 2 — Scaffold.** `nuxt.config.ts` (SSR per D2, modules, Less global injection, runtimeConfig), `app.vue`, `layouts/default.vue`, global plugins (FontAwesome, vfm, apexcharts), global CSS wiring, `router.options.ts`. Move `public/` assets. No behavior yet beyond an empty shell. *Verify:* app boots, layout markup matches.
- **Phase 3 — Backend core & infra.** Move `src/` services/facades/endpoints/types/validators/constants under `server/`; wire Redis, config, logging; `server/plugins/socket.ts`, `server/plugins/tasks.ts`, `server/routes/ping.get.ts`. *Verify:* server boots, `/ping` works, socket connects, existing service unit tests pass against new paths.
- **Phase 4 — Auth & sessions.** `/auth/*` handlers, session store (D7), `/json-api` auth middleware, OIDC. *Verify:* login/logout/me, OIDC flow, 401 shapes; port `AuthRoute` tests.
- **Phase 5 — `/api` endpoints.** Dispatch handler + newznab/sabnzbd/generic endpoints incl. XML, NZB-file, multer addfile. *Verify:* port endpoint tests; XML byte-diff old vs new.
- **Phase 6 — `/json-api` endpoints.** All CRUD + stats + search/details/download. *Verify:* port route tests; response-shape diffs.
- **Phase 7 — Frontend pages & state.** Layout/NavBar/LeftHandNav, composables replacing `provide/inject`, all `pages/`, components, modals, dialogService, Socket.IO client, charts. *Verify:* per-route render + behavior walk-through.
- **Phase 8 — Build/Docker/CI & cleanup.** Update `Dockerfile`, `docker_entry.sh`, scripts, Jest config; PWA decision (D13); remove `src/` and `frontend/` (D3). Update `CLAUDE.md`/`AGENTS.md`.
- **Phase final — Parity verification.** Per-endpoint API contract checklist (status/headers/body), per-route render checklist, UI walk, gap report.

---

## 6. Open questions blocking/affecting implementation

- **Q1 (D2):** True SSR HTML pre-render, or SSR-runtime with client-time data fetching (recommended for parity)?
- **Q2 (D7):** Is a one-time re-login on deploy acceptable, or must existing `connect.sid` cookies stay valid (may require mounting `express-session`)?
- **Q3 (D9):** Confirm single-process deployment (in-memory socket + cron assume it).
- **Q4 (D13):** PWA approach — add `@vite-pwa/nuxt` / hand-port / drop for v1?
- **Q5 (D11):** Preserve "blank shell on unknown route" via `[...slug].vue`, or accept Nuxt default 404?

---

*End of v1 plan. Awaiting approval before any implementation (Phase 2+).*
