# MCC Tracker — План подготовки MVP

## Обзор стека

| Слой | Технология | Хостинг |
|---|---|---|
| Frontend | React + Vite + Yandex Maps JS API | Oracle Compute VM |
| Backend | Node.js + Express | Oracle Compute VM |
| Database | Oracle Autonomous Database (ATP) | Always Free (managed) |
| Карта / Каталог | Yandex Maps JS API | Внешний сервис |

---

## Фаза 1 — Инфраструктура Oracle Cloud

### 1.1 Создание аккаунта Oracle Cloud
- Зарегистрироваться на cloud.oracle.com (карта нужна, списаний нет)
- Home Region: Canada Southeast (Toronto) или ближайший доступный
- Подтвердить аккаунт

### 1.2 Создание Compute VM

```
OCI Console → Compute → Instances → Create Instance
  Name:          mcc-tracker-vm
  Image:         Ubuntu 22.04 (Canonical)
  Shape:         VM.Standard.E2.1.Micro (Always Free)
  VCN:           mcc-tracker-vcn (создать новый)
  Subnet:        Public subnet
  Public IPv4:   ✅ Включить
  SSH keys:      Скачать приватный ключ → сохранить как mcc-tracker.pem
```

После создания открыть порты в Security List:

| Порт | Протокол | Назначение |
|---|---|---|
| 22 | TCP | SSH |
| 80 | TCP | HTTP (React) |
| 443 | TCP | HTTPS |
| 3000 | TCP | Node.js API |

```
OCI → Networking → Virtual Cloud Networks → mcc-tracker-vcn
  → Security Lists → Default → Add Ingress Rules
```

### 1.3 Создание Autonomous Database (ATP)

```
OCI Console → Oracle Database → Autonomous Transaction Processing → Create
  Display name:  mcc-tracker-db
  DB name:       MCCTRACKERDB
  Workload:      Transaction Processing
  Deployment:    Serverless
  Always Free:   ✅ ON
  Password:      <ADMIN_PASSWORD>  ← сохранить в менеджере паролей
```

Получить Wallet для подключения из Node.js:
```
ATP → DB Connection → Download Instance Wallet → mcc-tracker-wallet.zip
```
Хранить локально, не коммитить в git.

---

## Фаза 2 — Настройка VM

### 2.1 Подключение по SSH

```bash
chmod 400 mcc-tracker.pem
ssh -i mcc-tracker.pem ubuntu@<PUBLIC_IP>
```

### 2.2 Установка зависимостей

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 — менеджер процессов для Node.js
sudo npm install -g pm2

# Nginx — реверс-прокси для React и API
sudo apt-get install -y nginx

# Oracle Instant Client (для oracledb)
sudo apt-get install -y libaio1
# Скачать и установить: oracle.com/database/technologies/instant-client
```

### 2.3 Структура на VM

```
/var/www/mcc-tracker/
├── frontend/          # React build (собранный)
└── backend/           # Node.js приложение
    ├── src/
    ├── wallet/        # Oracle Wallet (не в git!)
    └── .env
```

### 2.4 Nginx конфиг

```nginx
server {
    listen 80;
    server_name <PUBLIC_IP>;

    # React (статика)
    location / {
        root /var/www/mcc-tracker/frontend/dist;
        try_files $uri /index.html;
    }

    # Node.js API
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Фаза 3 — База данных

### 3.1 Схема (db/schema.sql)

```sql
-- Магазины (только те, по которым есть голоса)
-- Основной идентификатор — yandex_firm_id
CREATE TABLE merchants (
    id              NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    yandex_firm_id  VARCHAR2(100)   NOT NULL UNIQUE,
    name            VARCHAR2(500),
    address         VARCHAR2(1000),
    lat             NUMBER(10,7),
    lon             NUMBER(10,7),
    created_at      TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL
);

-- Голоса пользователей за MCC-код
CREATE TABLE mcc_votes (
    id              NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    merchant_id     NUMBER          NOT NULL REFERENCES merchants(id),
    user_id         NUMBER          NOT NULL REFERENCES users(id),
    mcc_code        VARCHAR2(4)     NOT NULL REFERENCES mcc_codes(mcc_code),
    voted_at        TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL,
    purchase_date   DATE
);

-- Пользователи
CREATE TABLE users (
    id              NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email           VARCHAR2(255)   NOT NULL UNIQUE,
    password_hash   VARCHAR2(255)   NOT NULL,
    created_at      TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL
);

-- Справочник MCC-кодов
CREATE TABLE mcc_codes (
    mcc_code        VARCHAR2(4)     PRIMARY KEY,
    description_ru  VARCHAR2(500)   NOT NULL,
    category        VARCHAR2(100)
);

-- Индексы
CREATE INDEX idx_votes_merchant ON mcc_votes(merchant_id, voted_at DESC);
CREATE INDEX idx_votes_user     ON mcc_votes(user_id);
CREATE INDEX idx_merchants_yid  ON merchants(yandex_firm_id);
```

---

## Фаза 4 — Backend (Node.js / Express)

### 4.1 Структура проекта

```
backend/
├── src/
│   ├── routes/
│   │   ├── merchants.js   # GET /merchants?lat=&lon=&radius=
│   │   ├── votes.js       # POST /votes
│   │   ├── stats.js       # GET /merchants/:id/stats
│   │   └── auth.js        # POST /auth/register, /auth/login
│   ├── services/
│   │   ├── mccService.js      # top_mcc, last_mcc
│   │   ├── geoService.js      # геофильтры
│   │   └── yandexService.js   # запросы к Yandex Maps API
│   ├── db.js              # подключение к Oracle ATP
│   └── app.js
├── .env.example
└── package.json
```

### 4.2 .env.example

```env
PORT=3000
DB_USER=mcctracker
DB_PASSWORD=
DB_CONNECTION_STRING=mcctrackerdb_high
ORACLE_WALLET_LOCATION=./wallet
JWT_SECRET=
YANDEX_MAPS_API_KEY=
```

### 4.3 Ключевые endpoints

| Method | Path | Описание |
|---|---|---|
| GET | `/api/merchants` | Список магазинов рядом (lat, lon, radius_m) |
| GET | `/api/merchants/:id/stats` | top_mcc, last_mcc, история голосов |
| POST | `/api/votes` | Проголосовать за MCC |
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход, возвращает JWT |

---

## Фаза 5 — Frontend (React + Vite)

### 5.1 Создание проекта

```bash
npm create vite@latest frontend -- --template react
cd frontend && npm install
npm install axios react-router-dom
```

### 5.2 Структура страниц

| Страница | Путь | Описание |
|---|---|---|
| Главная | `/` | Карта + список магазинов, фильтры |
| Магазин | `/merchant/:yandex_firm_id` | История MCC, кнопки голосования |
| Профиль | `/profile` | История голосов пользователя |
| Логин | `/login` | Авторизация |

### 5.3 Интеграция Yandex Maps

```javascript
// В index.html
<script src="https://api-maps.yandex.ru/v3/?apikey=<KEY>&lang=ru_RU"></script>

// Логика: магазины НЕ хранятся у нас целиком
// При движении карты → запрос в Yandex Maps API за POI
// При клике на магазин → запрос в наш API за MCC-статистикой по yandex_firm_id
```

---

## Фаза 6 — Деплой

### 6.1 Backend

```bash
cd /var/www/mcc-tracker/backend
npm install --production
pm2 start src/app.js --name mcc-api
pm2 save && pm2 startup
```

### 6.2 Frontend

```bash
cd frontend
npm run build
# Скопировать dist/ на VM в /var/www/mcc-tracker/frontend/dist/
```

### 6.3 Чеклист перед запуском

- [ ] VM создана, SSH работает, порты открыты
- [ ] ATP создана, Wallet скачан на VM
- [ ] Схема БД применена, справочник MCC заполнен
- [ ] Node.js API запущен через PM2, отвечает на `/api/merchants`
- [ ] React build собран, Nginx отдаёт фронт
- [ ] Yandex Maps API key подключён, карта открывается
- [ ] Голосование работает end-to-end
- [ ] JWT авторизация работает
- [ ] Wallet и `.env` не попали в git

---

## Структура репозитория

```
mcc-tracker/
├── business-idea/
│   ├── overview.md
│   ├── market.md
│   └── financials.md
├── architecture/
│   └── mvp-architecture.md
├── technical/
│   └── MVP-PLAN.md
├── db/
│   ├── schema.sql
│   ├── seed_mcc_codes.sql
│   └── grants.sql
├── backend/
│   ├── src/
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   └── vite.config.js
├── scripts/
│   └── import_yandex.py   # разовый импорт данных
└── .gitignore
```

---

## Порядок выполнения

```
1.  Oracle Cloud аккаунт                              (~15 мин)
2.  Compute VM + открыть порты                        (~20 мин)
3.  ATP + Wallet                                      (~15 мин)
4.  Настройка VM: Node.js, Nginx, PM2                 (~30 мин)
5.  Схема БД + seed_mcc_codes.sql                     (~30 мин)
6.  Backend: Express + подключение к Oracle           (~3 часа)
7.  Backend: endpoints votes, stats, auth             (~3 часа)
8.  Frontend: React + Yandex Maps + карта             (~4 часа)
9.  Frontend: голосование + страница магазина         (~3 часа)
10. Деплой + Nginx + PM2                              (~1 час)
11. Финальное тестирование + чеклист                  (~1 час)
────────────────────────────────────────────────────────────────
Итого: ~16 часов
Phase 2: Android App (тот же REST API), Redis-кэш, монетизация
```
