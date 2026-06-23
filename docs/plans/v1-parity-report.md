# v1 — Nuxt Migration Parity Report

Companion to `docs/plans/v1-nuxt-migration.md`. Records what was verified, how, and
every known deviation from strict 1:1 parity. **Claims are limited to what was
actually exercised**; unverifiable-in-sandbox items are called out explicitly.

## Verification environment
- Built with `npm run build` (Nuxt 4 / Nitro, node-server preset); run with `node .output/server/index.mjs`.
- Local Redis (`redis-server`) for config/sessions/queue.
- **Could not run in this sandbox:** a headless browser (Chromium download blocked
  by the proxy) and the external tools `get_iplayer` / `yt-dlp` / a real OIDC IdP /
  live *arr/SAB/NZBGet apps / the BBC network.

## Legend
- ✅ verified at runtime (request issued, response asserted)
- 🟰 logic is a verbatim/faithful port of code covered by the existing Jest suite, but the live path needs external services not available here
- 🧪 covered by the retained Jest suite (367 tests pass)
- ⏳ requires a browser or live external service to verify (tracked below)

---

## 1. API contract checklist

### Auth (`/auth/*`) — verified end-to-end against local Redis
| Endpoint | Status/body verified | Result |
|---|---|---|
| `GET /auth/method` | `{"message":"form"}` | ✅ |
| `GET /auth/me` (no session) | `401 {"error":"Not Authorised"}` | ✅ |
| `POST /auth/login` (bad) | `401 {"error":"Invalid Credentials"}` | ✅ |
| `POST /auth/login` (good, bcrypt) | `{"status":true}` + session cookie | ✅ |
| `GET /auth/me` (session) | `{"username":"admin"}` | ✅ |
| `GET /auth/logout` | `{"status":true}`, session cleared | ✅ |
| `AUTH_TYPE=none` auto-login (`/auth/me`, gate) | `{"username":"admin"}` / gate passes | ✅ |
| legacy MD5 → bcrypt migration on login | 🧪 (Utils + AuthRoute logic ported verbatim) |
| `GET /auth/generateToken`, `POST /auth/resetPassword` | token logic ported verbatim | 🧪 |
| `GET /auth/oidc/login` (not enabled) | `400 {"error":"OIDC Not Enabled"}` path | ✅ |
| `POST /auth/oidc/test`, `GET /auth/oidc/callback` | faithful port (PKCE/state/redirect/test HTML) | ⏳ needs live IdP |

### `/json-api/*` gate
| Check | Result |
|---|---|
| unauthenticated → `401 {"error":"Not Authorised"}` | ✅ |
| authenticated → passes through | ✅ |

### Indexer/Downloader API (`/api`) — verified on running server
| Dispatch | Verified | Result |
|---|---|---|
| `t=caps` | full caps XML, `application/xml; charset=utf-8` | ✅ |
| `mode=version` | `{"version":"1.0.0"}` | ✅ |
| `mode=get_config` | `{"config":{…}}` (download/complete dir) | ✅ |
| `mode=queue` | `{"queue":{…}}` skeleton | ✅ |
| `mode=history` | `{"history":{…}}` skeleton | ✅ |
| `mode=nzb-download` | NZB XML + `<?xml?>`/DOCTYPE prologue, `application/x-nzb; charset=utf-8` | ✅ |
| unknown `mode` | `404 {"error":"API Not Found"}` | ✅ |
| missing/bad `apikey` | `401 {"error":"Not Authorised"}` | ✅ |
| `t=tvsearch\|movie\|search` (RSS) | builder identical; records search stats; uses createNZBDownloadLink | 🟰 needs get_iplayer/BBC |
| `mode=addfile` (multer→`readMultipartFormData`) | parse + queue/forward logic ported verbatim | 🟰🧪 |

### `/json-api/*` (data) — verified with `AUTH_TYPE=none` + Redis
| Endpoint | Result |
|---|---|
| `GET /config`, `/config/hiddenSettings`, `/config/qualityProfiles` | ✅ |
| `PUT /config` (empty → `400 invalid_fields`; password-hash logic) | ✅ (400) / 🧪 (hash) |
| `GET /apps`, `/apps/types` | ✅ |
| `POST/PUT /apps` (create/update + integrations), `/apps/test`, `/apps/updateApiKey` | 🟰🧪 (needs live *arr) |
| `DELETE /apps` | 🧪 |
| `GET/POST/PUT/DELETE /synonym` | ✅ (GET + POST create returns list w/ id) |
| `GET /synonym/lookup/:appId` | 🟰 needs live *arr |
| `GET/POST/PUT/DELETE /offSchedule`, `POST /offSchedule/refresh` | ✅ (GET) / 🧪 |
| `GET/DELETE /queue/queue`, `/queue/history` (+ socket emit) | ✅ (GET) / 🧪 |
| `GET /stats/{searchHistory,grabHistory,uptime,cacheSizes}` | ✅ |
| `POST /nzb/test`, `GET /search`, `GET /details`, `GET /download`, `GET /cache-refresh` | 🟰 needs get_iplayer/live clients |

### `/ping`
| Check | Result |
|---|---|
| Redis down → `503 {"status":"ERROR","message":"Redis error - …"}` | ✅ |
| Redis up → `{"status":"OK"}` | ✅ |

---

## 2. Route coverage checklist (frontend)

Every original Vue Router route resolves to a Nuxt page (build emits all routes):

| Original | Nuxt page | Name match |
|---|---|---|
| `/` → `/queue` | `pages/index.vue` (`navigateTo('/queue')`) | ✅ 302→/queue verified |
| `/queue` | `pages/queue.vue` | ✅ |
| `/info` (`queueInfo`) | `pages/info.vue` | path-based nav (`/info`) ✅ |
| `/logs` | `pages/logs.vue` | ✅ |
| `/about` | `pages/about.vue` | ✅ |
| `/settings` | `pages/settings.vue` | ✅ |
| `/synonyms` | `pages/synonyms.vue` | ✅ |
| `/login` | `pages/login.vue` | ✅ |
| `/search` (`search`) | `pages/search.vue` | auto-name `search` ✅ |
| `/download` (`download`) | `pages/download.vue` | auto-name `download` ✅ |
| `/offSchedule` | `pages/offSchedule.vue` | ✅ |
| `/apps` | `pages/apps.vue` | ✅ |
| `/stats` | `pages/stats.vue` | ✅ |

- Auth guard (`router.beforeEach`) → `middleware/auth.global.ts` (client-side).
- `scrollBehavior` → `app/router.options.ts` (typo preserved).
- All 35 components copied verbatim; build compiles every SFC successfully.

---

## 3. UI parity check

- ✅ App builds; server returns the document (`200`, `#__nuxt`, client bundle served).
- ✅ Global Less variables + `global.less` wired; FontAwesome/vue-final-modal/ApexCharts registered as plugins matching `main.js`; `<head>` (title/viewport/favicon/apple-touch-icon) reproduced; PWA via `@vite-pwa/nuxt`.
- ⏳ **Visual/interactive parity not yet verified** — a headless browser could not be installed (Chromium download blocked). Recommended next step: run `npm run build && npm run start` with Redis and walk each view in a browser (login, queue realtime via socket, search, settings save + OIDC test popup, stats charts, modals).

---

## 4. Gap report — known deviations from byte-for-byte parity

| # | Deviation | Why / status |
|---|---|---|
| G1 | Session cookie format differs (`useSession` sealed cookie vs express-session `connect.sid`) | Accepted per Q2 (one-time re-login on deploy). Cookie name kept `connect.sid`. |
| G2 | `X-Powered-By: Express` and Express `ETag` headers absent | Intentional — faking an Express identity on a Nuxt server is wrong and has no functional impact. |
| G3 | JSON `Content-Type` charset | **Fixed** — `server/plugins/jsonCharset.ts` appends `; charset=utf-8` to match `res.json`. |
| G4 | `/` redirect is server 302 (was client redirect) | Same net result (lands on `/queue`); auth still enforced client-side. |
| G5 | App shell rendered via `<ClientOnly>` | Per Q1: keeps fetch timing/behaviour identical to the SPA; SSR provides document + API. Final rendered state identical. |
| G6 | OIDC flows not runtime-verified | Faithful port; needs a live IdP. |
| G7 | `/api` search/RSS, `/json-api` search/details/download/test, app integrations | Logic verbatim; need `get_iplayer`/BBC/live *arr/SAB to exercise. Covered by Jest. |
| G8 | Socket.IO realtime end-to-end (queue/history/log push) | `/socket.io/` polling endpoint returns 200; `socketService` reused verbatim. Full client round-trip needs a browser. |
| G9 | Legacy `src/` and `frontend/` retained | Kept so the 367-test Jest suite (which targets `src/` and the express routes) keeps providing regression coverage. Full removal is gated on porting the express route/endpoint tests to the h3 handlers. |
| G10 | `getHost()` returns `''` (same-origin); socket uses `io()`; OIDC debug `:8080`/`:4404` repoints | Required by FE+BE unification (D12); same effective requests. |

---

## 5. Test status
- `npm test` → **367/367 tests pass**, 53/54 suites. The one suite import failure
  (`tests/facade/downloadFacade.test.ts`) is a dependency/Node-environment issue in
  `tmp`/`fengari` (`constants.O_CREAT`) that **reproduces on `origin/main`** with the
  same toolchain — not a migration regression.

---

## 6. Recommended closing steps (not yet done)
1. Browser walkthrough of all 13 routes for visual/interactive parity (G5/G8).
2. Live verification of OIDC, search/download, and app integrations against real services (G6/G7).
3. Port the express route/endpoint Jest tests to the h3 handlers, then delete `src/` and `frontend/` (G9).
