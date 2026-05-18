# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

Crowdsourced map where users vote on MCC (Merchant Category Code) for retail locations to maximize cashback on bank cards. Users see a 2GIS map with colored markers per category, tap a merchant, and vote on its MCC.

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
NODE_PATH=backend/node_modules node db/seed_osm_spb.js
```

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
[Browser]
  React + Vite SPA
  2GIS MapGL (npm, not script tag)
       │ VITE_API_URL (env)
       ▼
[Nginx on VM 147.5.126.225]
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

**Frontend env vars:**
- `VITE_API_URL` — backend base URL (without trailing slash, no `/api` suffix)
- `VITE_2GIS_KEY` — 2GIS MapGL key (demo key, ~1 month validity from May 2026)

**Vite dev proxy:** `/api` in `vite.config.js` proxies to the production VM. The backend routes are mounted without `/api` prefix — Nginx strips it.

**Backend tests mock the DB:** all `routes/*.test.js` inject a fake `db` object. Tests never hit Oracle. `mccService.test.js` is pure unit — no DB at all.

**node_modules must not be committed.** `.gitignore` covers both `node_modules/` and `frontend/node_modules/`. If they appear tracked, run `git rm -r --cached frontend/node_modules/`.

**OSM seed data:** `db/seed_osm_spb.js` fetches up to 10000 elements (`node` + `way`) from Overpass API for SPb bounding box (59.75–60.15 lat, 29.50–30.75 lon). `way` elements use `out body center` to get centroid coordinates; stored with ID prefix `osm_w_<id>` (nodes use `osm_<id>`). Run on VM — needs Oracle wallet. Inserts a seed vote per merchant so MCC shows on map immediately. Timeout raised to 180 s for larger queries.

## MCC codes in use

| Code | Category | Marker color |
|------|----------|-------------|
| 5411 | Продукты (supermarket) | green `#43a047` |
| 5912 | Аптека (pharmacy) | red `#e53935` |
| 5812 | Ресторан (restaurant/cafe) | orange `#fb8c00` |
| 5541 | АЗС (fuel) | blue `#1e88e5` |
| 5311 | Универмаг (department store) | purple `#8e24aa` |
| 5999 | Прочее | grey `#607d8b` |

All six codes are seeded in `mcc_codes` table. To add a new category: seed the DB, add to `MCC_LABELS`/`MCC_ICONS`/`MARKER_COLORS` in `utils/mcc.js`.

## Infrastructure

- **VM:** Oracle Cloud, Ubuntu 22.04, 1 GB RAM + 1 GB swap, IP `147.5.126.225`
- **Process manager:** PM2, process name `mcc-api`
- **Oracle wallet:** `/var/www/mcc-tracker/wallet/` on VM — never in git
- **GitHub Secrets:** `VM_HOST`, `VM_USER`, `VM_SSH_KEY` (ed25519, generated May 2026)
- **SSH key (admin):** `ssh-key/ssh-key-2026-05-10.key` — local only, in `.gitignore`
