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

npm test                                        # all 38 tests
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
  routes: /auth  /merchants  /votes  /merchants/:id/stats  /admin/*
       │
       ▼
[Oracle ATP — always-free, 20 GB]
  tables: merchants, mcc_votes, users, mcc_codes, user_cards, card_cashback_rules
  view:   v_merchant_stats  (aggregates last_mcc, top_mcc_30d)
```

## Key data flow

**Viewing the map:**
1. `MapPage` calls `useMerchants(lat, lon, 1000)` on every map `moveend`
2. Hook hits `GET /merchants?lat=&lon=&radius_m=` — bounding-box query against `v_merchant_stats`
3. Returns rows with `LAST_MCC`, `TOP_MCC_30D`, `VOTES_TOTAL` already aggregated by the view
4. `Map.jsx` renders 2GIS markers; marker icon/color comes from `markerIcon(mcc)` in `utils/mcc.js`

**Voting:**
1. User opens `MerchantPage` → `GET /merchants/:yandex_firm_id/stats`
2. Clicks "Проголосовать" → `VoteModal` → `POST /votes` with JWT
3. Backend does `MERGE INTO merchants` (upsert) then `INSERT INTO mcc_votes`
4. `v_merchant_stats` view recalculates automatically on next read

**MCC filter:**
- `MapPage` holds `selectedMccs: Set<string>` (multi-select)
- `filteredMerchants` is computed client-side; passed to both `<Map>` and `<MerchantList>`
- Filter bar is always visible above the map; chips toggle entries in the Set

## Admin panel

**URL:** `/admin` — доступна только пользователям с `IS_ADMIN = 1` в БД (проверяется на бэкенде middleware'ом, дублируется в JWT).

**API роуты** (все требуют JWT + `is_admin: true`):
| Method | Path | Описание |
|--------|------|----------|
| GET | `/admin/users?q=&offset=` | Список пользователей с поиском по email, пагинация 20/стр |
| GET | `/admin/users/:id/votes?offset=` | История голосований пользователя |
| PUT | `/admin/users/:id` | Изменить email / пароль / is_admin / is_blocked |
| DELETE | `/admin/users/:id` | Удалить аккаунт + все данные (транзакция) |

**Защита:** `requireAuth` → `requireAdmin` в `backend/src/middleware/requireAdmin.js`. Администратор не может изменить/удалить собственный аккаунт.

**Блокировка:** заблокированный пользователь (`IS_BLOCKED = 1`) получает 403 при попытке войти.

**JWT:** поле `is_admin` включается в payload при логине. Фронтенд читает его через `getCurrentUserIsAdmin()` в `utils/auth.js` — показывает/скрывает пункт меню и защищает маршрут `AdminGuard`.

**Как назначить первого администратора** (выполнить на VM):
```bash
ssh -i ssh-key/ssh-key-2026-05-10.key ubuntu@147.5.126.225
cat > /tmp/set_admin.js << 'EOF'
process.chdir('/var/www/mcc-tracker/app');
require('dotenv').config({path: 'backend/.env'});
const db = require('/var/www/mcc-tracker/app/backend/src/db');
db.init().then(async () => {
  const r = await db.execute(
    'UPDATE users SET is_admin = 1 WHERE email = :email',
    { email: 'your@email.com' }
  );
  console.log('rows:', r.rowsAffected);
  process.exit(0);
});
EOF
NODE_PATH=/var/www/mcc-tracker/app/backend/node_modules node /tmp/set_admin.js
```
После этого пользователю нужно перелогиниться (старый JWT не содержит `is_admin`).

**DB-миграция** (уже применена, хранится в `db/migrate_admin.sql`):
```sql
ALTER TABLE users ADD is_admin NUMBER(1) DEFAULT 0 NOT NULL;
ALTER TABLE users ADD is_blocked NUMBER(1) DEFAULT 0 NOT NULL;
```

## Important quirks

**Oracle bind variables:** never use `:uid`, `:mid`, `:mcc` — `UID` is an Oracle reserved pseudo-column. Use full names like `:userId`, `:merchantId`, `:mccCode`.

**Merchant geo-search:** uses a bounding box approximation (`LAT_PER_METER = 1/111000`), not Haversine. Accurate enough for 1–5 km radius.

**Map centering:** last position is persisted in `localStorage` key `mcc_last_center`. On mount, geolocation is only requested if no saved position exists.

**Marker icons:** SVG data URIs built in `utils/mcc.js → markerIcon()`. Uses emoji in SVG `<text>` with emoji font stack. `MARKER_LETTERS` was removed — don't re-add it.

**Frontend env vars:**
- `VITE_API_URL` — backend base URL (without trailing slash, no `/api` suffix)
- `VITE_2GIS_KEY` — 2GIS MapGL key (demo key, ~1 month validity from May 2026)

**Vite dev proxy:** `/api` in `vite.config.js` proxies to the production VM. The backend routes are mounted without `/api` prefix — Nginx strips it.

**Backend tests mock the DB:** all `routes/*.test.js` inject a fake `db` object. Tests never hit Oracle. `mccService.test.js` is pure unit — no DB at all.

**node_modules must not be committed.** `.gitignore` covers both `node_modules/` and `frontend/node_modules/`. If they appear tracked, run `git rm -r --cached frontend/node_modules/`.

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
