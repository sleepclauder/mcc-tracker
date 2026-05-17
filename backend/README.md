# MCC Tracker — Backend

Node.js / Express API для хранения и получения MCC-кодов магазинов.

## Стек

- **Runtime:** Node.js 20 LTS
- **Framework:** Express 4
- **Database:** Oracle Autonomous Database (ATP) через `oracledb`
- **Auth:** JWT (jsonwebtoken)
- **Process manager:** PM2

## Структура

```
backend/
├── src/
│   ├── app.js              # Express app, middleware
│   ├── db.js               # Пул подключений к Oracle ATP
│   ├── routes/
│   │   ├── auth.js         # POST /auth/register, POST /auth/login
│   │   ├── merchants.js    # GET /merchants
│   │   ├── votes.js        # POST /votes
│   │   └── stats.js        # GET /merchants/:id/stats
│   ├── middleware/
│   │   └── auth.js         # JWT-проверка для защищённых роутов
│   └── services/
│       └── mccService.js   # top_mcc, last_mcc логика
├── .env.example
└── package.json
```

## API

### Auth

| Method | Path | Body | Описание |
|---|---|---|---|
| POST | `/auth/register` | `{email, password}` | Регистрация |
| POST | `/auth/login` | `{email, password}` | Вход, возвращает JWT |

### Merchants

| Method | Path | Query | Описание |
|---|---|---|---|
| GET | `/merchants` | `lat, lon, radius_m` | Магазины рядом с координатой |

### Stats

| Method | Path | Описание |
|---|---|---|
| GET | `/merchants/:yandex_firm_id/stats` | MCC-статистика по магазину |

### Votes

| Method | Path | Body | Auth | Описание |
|---|---|---|---|---|
| POST | `/votes` | `{yandex_firm_id, name, address, lat, lon, mcc_code, purchase_date?}` | JWT | Проголосовать за MCC |

## Установка и запуск

```bash
cp .env.example .env
# Заполнить .env

npm install
node src/app.js          # dev
pm2 start src/app.js --name mcc-api   # prod
```

## Переменные окружения

См. `.env.example`

## Деплой

Автоматически через GitHub Actions при пуше в `main`.
Wallet хранится на VM по пути `/var/www/mcc-tracker/wallet/` — вне репозитория.
