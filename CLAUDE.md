# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**ЧекБэк** — crowdsourced map where users vote on MCC (Merchant Category Code) for retail locations to maximize cashback on bank cards. Users see a 2GIS map with colored markers per category, tap a merchant, and vote on its MCC.

**Brand name:** always written as one word — **ЧекБэк** (no space). In the header, "Чек" is black and "Бэк" is red (`#e53935`). Both are wrapped in a single `<span>` so flexbox gap doesn't split them.

Live at: **https://checkback.duckdns.org**

## Commands

### Backend
```bash
cd backend
npm install
node src/app.js          # run dev server (port 3000)
node --watch src/app.js  # run with auto-restart

npm test                                        # all tests
node --test src/routes/auth.test.js             # single test file
npm run test:coverage                           # with coverage
```

### Frontend
```bash
cd frontend
npm install
npm run dev              # Vite dev server (proxies /api → VM)
npm run build            # production build → dist/
npm run test:run         # all Vitest tests (non-watch)
npx vitest src/components/MerchantCard.test.jsx # single test file
```

### DB seed (run on VM only — needs Oracle wallet)
```bash
# From repo root on the VM:
NODE_PATH=backend/node_modules node db/seed_osm_spb.js               # Saint Petersburg
NODE_PATH=backend/node_modules node db/seed_osm_cities.js             # Moscow + Podolsk (all)
NODE_PATH=backend/node_modules node db/seed_osm_cities.js moscow       # Moscow only
NODE_PATH=backend/node_modules node db/seed_osm_cities.js podolsk      # Podolsk only
```

### Android (Capacitor)
```bash
cd frontend
npm run build            # production build with HTTPS API URL
npx cap sync android     # copy dist/ into android project
npx cap open android     # open in Android Studio → Build APK
```
Full details: `docs/android-plan.md`

### Deploy (manual, from dev machine)
```bash
ssh -i ssh-key/ssh-key-2026-05-10.key ubuntu@147.5.126.225
# Then on VM:
cd /var/www/mcc-tracker/app
git fetch origin main && git reset --hard origin/main
cd backend && npm install --production && pm2 reload mcc-api
cd ../frontend && npm install && npm run build
```

CI/CD (GitHub Actions) triggers automatically on push to `main`: runs both test suites, then SSH-deploys to VM.

## Architecture

```
[Browser / Android WebView (ЧекБэк app)]
  React + Vite SPA
  2GIS MapGL (npm, not script tag)
       │ VITE_API_URL (env) → https://checkback.duckdns.org/api
       ▼
[Nginx on VM 147.5.126.225 — checkback.duckdns.org]
  /         → frontend/dist/   (static)
  /api/*    → localhost:3000   (proxy strip /api prefix)
       │
       ▼
[Node.js/Express — PM2 process "mcc-api"]
  routes: /auth  /merchants  /votes  /merchants/:id/stats
          /cards  /gis  /admin/*
       │
       ▼
[Oracle ATP — always-free, 20 GB]
  tables: merchants, mcc_votes, users, mcc_codes, user_cards, card_cashback_rules
  view:   v_merchant_stats  (aggregates last_mcc, top_mcc_30d)
```

## Key data flow

**Viewing the map:**
1. `MapPage` calls `useNearbyMerchants(lat, lon, 3000)` on every map `moveend`
2. Hook makes two parallel requests:
   - `GET /merchants?lat=&lon=&radius_m=` — bounding-box query against `v_merchant_stats`
   - `GET /gis/nearby?lat=&lon=&radius_m=` — live results from 2GIS Catalog API (requires `GIS_KEY` env var; silently returns `[]` if missing or key invalid)
3. Results are merged: DB rows take priority; GIS rows added only if `YANDEX_FIRM_ID` not already in DB
4. `Map.jsx` clusters merchants with **supercluster**: at low zoom shows blue circle with count, at zoom ≥ 14 shows individual colored markers
5. Marker icon/color comes from `markerIcon(mcc)` in `utils/mcc.js`

**Voting:**
1. User opens `MerchantPage` → `GET /merchants/:yandex_firm_id/stats`
2. Clicks "Проголосовать" → `VoteModal` → `POST /votes` with JWT
3. Backend does `MERGE INTO merchants` (upsert) then `INSERT INTO mcc_votes`
4. `v_merchant_stats` view recalculates automatically on next read

**MCC filter:**
- `MapPage` holds `selectedMccs: Set<string>` (multi-select)
- `filteredMerchants` is computed client-side; passed to both `<Map>` and `<MerchantList>`
- Filter bar is always visible above the map; chips toggle entries in the Set

**Admin panel:**
- Route `/admin` in the app (protected by `AdminGuard` — redirects non-admins)
- Backend `/admin/*` requires JWT + `is_admin = 1` (`requireAuth` + `requireAdmin` middleware chain)
- Admin can list/search users, view their votes, edit email/password/is_admin/is_blocked, delete users
- `is_admin` flag is included in the JWT payload; `getCurrentUserIsAdmin()` in `utils/auth.js` reads it from the token
- Admin cannot edit or delete their own account (backend enforces this)

## Important quirks

**Oracle bind variables:** never use `:uid`, `:mid`, `:mcc` — `UID` is an Oracle reserved pseudo-column. Use full names like `:userId`, `:merchantId`, `:mccCode`.

**Merchant geo-search:** uses a bounding box approximation (`LAT_PER_METER = 1/111000`), not Haversine. Accurate enough for 1–5 km radius.

**Map centering:** last position is persisted in `localStorage` key `mcc_last_center`. On mount, geolocation is only requested if no saved position exists.

**Marker clustering:** `Map.jsx` uses `supercluster` (not 2GIS native — `GeoJsonSource` doesn't support clustering). Clusters rendered as `Marker` with SVG data-URI icon. Do NOT use `HtmlMarker` — may be absent in CDN runtime. Do NOT use `getBounds()` — throws before style loads; compute bbox from `getCenter()` instead. Always trigger first render on `styleload` event, not immediately after `new mapgl.Map()`.

**Marker icons:** SVG data URIs built in `utils/mcc.js → markerIcon()`. Uses emoji in SVG `<text>` with emoji font stack. `MARKER_LETTERS` was removed — don't re-add it.

**GIS_KEY:** env var on VM for 2GIS Catalog API (`/gis/nearby`). If expired or invalid (403), the route returns `[]` — app degrades gracefully to DB-only data. Stored in `backend/.env` on VM (never in git).

**2GIS Catalog API limits** (`/3.0/items`): `radius` max **2000 m** (not 5000), `page_size` max **10** (not 50). Both violations return HTTP 200 with `meta.code: 400` in the body — `r.ok` is `true` but `result` is absent. Always check `data.meta?.code === 200` after parsing. The `/gis/nearby` backend route caps both automatically.

**2GIS rubric → MCC mapping** (used in `/gis/nearby` to assign `LAST_MCC` to GIS-only results so markers show the correct color/icon immediately, without waiting for user votes):

| rubric_id | 2GIS category | MCC |
|-----------|--------------|-----|
| 164 | Продуктовые магазины | 5411 |
| 179 | Аптеки | 5912 |
| 101 | Рестораны, кафе | 5812 |
| 18547 | АЗС | 5541 |
| 225 | Торговые центры | 5311 |
| 9041 | Легковой автосервис | 7538 |
| 7689 | Шиномонтаж | 7534 |
| 341 | Страхование | 6411 |

The `rubric_id` filter also prevents non-commercial POI (waste sites, infrastructure, etc.) from appearing on the map.

**Frontend env vars:**
- `VITE_API_URL` — backend base URL (without trailing slash, no `/api` suffix)
- `VITE_2GIS_KEY` — 2GIS MapGL key (demo key, ~1 month validity from May 2026)

**Vite dev proxy:** `/api` in `vite.config.js` proxies to the production VM. The backend routes are mounted without `/api` prefix — Nginx strips it.

**Backend tests mock the DB:** all `routes/*.test.js` inject a fake `db` object. Tests never hit Oracle. `mccService.test.js` is pure unit — no DB at all.

**node_modules must not be committed.** `.gitignore` covers both `node_modules/` and `frontend/node_modules/`. If they appear tracked, run `git rm -r --cached frontend/node_modules/`.

**OSM seed data:** Two seed scripts fetch from Overpass API, both run on VM only (need Oracle wallet):
- `db/seed_osm_spb.js` — Saint Petersburg (bbox 59.75–60.15 N, 29.50–30.75 E), up to 10 000 elements, ID prefix `osm_` / `osm_w_`
- `db/seed_osm_cities.js` — Moscow (bbox 55.49–55.92 N, 37.32–37.97 E, prefix `osm_msk_` / `osm_msk_w_`) and Podolsk (bbox 55.38–55.51 N, 37.47–37.62 E, prefix `osm_podolsk_`), up to 50 000 elements each. Accepts city names as CLI args (`moscow`, `podolsk`); defaults to all.

`way` elements use `out body center` to get centroid coordinates. Both scripts insert a seed vote per merchant so MCC shows on map immediately. Includes all 8 MCC categories (including auto service 7538, tire service 7534, insurance 6411). Timeout 180 s.

## MCC codes in use

| Code | Category | Marker color |
|------|----------|-------------|
| 5411 | Продукты (supermarket) | green `#43a047` |
| 5912 | Аптека (pharmacy) | red `#e53935` |
| 5812 | Ресторан (restaurant/cafe) | orange `#fb8c00` |
| 5541 | АЗС (fuel) | blue `#1e88e5` |
| 5311 | Универмаг (department store) | purple `#8e24aa` |
| 7538 | Автосервис (auto service) | teal `#00897b` |
| 7534 | Шиномонтаж (tire service) | brown `#795548` |
| 6411 | Страховая (insurance) | indigo `#3949ab` |
| 5999 | Прочее | grey `#607d8b` |

All codes are seeded in `mcc_codes` table. To add a new category: seed the DB, add to `MCC_LABELS`/`MCC_ICONS`/`MARKER_COLORS` in `utils/mcc.js`.

## Infrastructure

- **VM:** Oracle Cloud, Ubuntu 22.04, 1 GB RAM + 1 GB swap, IP `147.5.126.225`
- **Domain:** `checkback.duckdns.org` (DuckDNS) — HTTPS via Let's Encrypt (certbot)
- **Process manager:** PM2, process name `mcc-api`
- **Oracle wallet:** `/var/www/mcc-tracker/wallet/` on VM — never in git
- **GitHub Secrets:** `VM_HOST`, `VM_USER`, `VM_SSH_KEY` (ed25519, generated May 2026)
- **SSH key (admin):** `ssh-key/ssh-key-2026-05-10.key` — local only, in `.gitignore`

## Android app

- **Name:** ЧекБэк, **appId:** `ru.mcctracker.app`
- **Stack:** Capacitor 7 wrapping the React/Vite SPA
- **Geolocation:** `@capacitor/geolocation` plugin (native permissions on Android)
- **API:** `https://checkback.duckdns.org/api` (baked in via `.env.production`)
- **Build:** Android Studio Panda → Build APK. See `docs/android-plan.md`
- **Icon/splash:** generated via `@capacitor/assets` from `frontend/assets/icon.svg`

### Versioning

Version is maintained in **one place only** — `frontend/package.json` → `"version"` field.
`android/app/build.gradle` reads it automatically at build time via `JsonSlurper`.

Format: **`yymmdd.NN`** (e.g. `260524.01`, `260524.02`, `260525.01`)

| field | example | formula |
|-------|---------|---------|
| `versionName` | `"260524.01"` | raw string from package.json |
| `versionCode` | `26052401` | `yymmdd × 100 + NN` |

To release a new build: bump `"version"` in `package.json`, then `npx cap sync android` + Build APK in Android Studio. Android requires `versionCode` to be strictly increasing — the formula guarantees this as long as dates advance or the suffix grows.
