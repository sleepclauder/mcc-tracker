# MCC Tracker — Обзор проекта

MCC Tracker позволяет пользователям видеть и голосовать за MCC-коды (Merchant Category Code) торговых точек на карте.

## Архитектура

```
Browser (React SPA)
        │  HTTPS
        ▼
    Nginx :443 (SSL — Let's Encrypt, checkback.duckdns.org)
    ├── /* → frontend/dist (статика)
    └── /api/* → Node.js Express :3000
                      │
                      ▼
           Oracle Autonomous Database (ATP)
           OCI — Wallet cwallet.sso (auto-login)
```

Сервер: OCI VM, IP `147.5.126.225`, домен `checkback.duckdns.org`  
Process manager: PM2 (backend)  
Build: Vite (frontend)  
SSL: Let's Encrypt (certbot webroot, авторенью через snap)

## Стек

| Слой       | Технологии                                       |
|------------|--------------------------------------------------|
| Frontend   | React 18, React Router v6, Vite, @2gis/mapgl     |
| Backend    | Node.js, Express, oracledb v6.10 (thin mode)     |
| БД         | Oracle ATP (Autonomous Transaction Processing)   |
| Auth       | JWT (jsonwebtoken) + bcryptjs                    |
| Карта      | 2GIS MapGL JS API (demo key, VITE_2GIS_KEY)      |
| Тесты      | Vitest + @testing-library/react (frontend), Vitest (backend) |

## Переменные окружения

**Backend** (`backend/.env`):
```
ORACLE_USER=MCCTRACKER
ORACLE_PASSWORD=...
ORACLE_CONNECT_STRING=...
ORACLE_WALLET_LOCATION=/path/to/wallet
JWT_SECRET=...
PORT=3000
```

**Frontend** (`frontend/.env`):
```
VITE_API_URL=https://checkback.duckdns.org/api
VITE_2GIS_KEY=<demo-key>
```

## Структура репозитория

```
mcc-tracker/
├── backend/            # Express API
│   └── src/
│       ├── app.js
│       ├── db.js
│       ├── middleware/auth.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── merchants.js
│       │   ├── stats.js
│       │   └── votes.js
│       └── services/mccService.js
├── db/
│   ├── schema.sql      # DDL: таблицы + view
│   ├── grants.sql      # права для пользователя
│   ├── seed_mcc_codes.sql
│   └── seed_spb.js     # тестовые мерчанты SPb
├── frontend/           # React SPA
│   └── src/
│       ├── App.jsx
│       ├── api/client.js
│       ├── components/ # Map, MerchantCard, MerchantList, VoteModal, AuthGuard
│       ├── hooks/      # useAuth, useMerchants
│       ├── pages/      # MapPage, MerchantPage, LoginPage
│       └── utils/auth.js
└── doc/                # документация
```
