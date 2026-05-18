# MCC Tracker — База данных

Oracle Autonomous Database (ATP). Схема: пользователь `MCCTRACKER`.  
DDL: [db/schema.sql](../db/schema.sql)

---

## Таблицы

### users

| Колонка        | Тип            | Описание                   |
|----------------|----------------|----------------------------|
| `id`           | NUMBER (PK)    | Auto-generated identity    |
| `email`        | VARCHAR2(255)  | Уникальный email           |
| `password_hash`| VARCHAR2(255)  | bcrypt hash                |
| `created_at`   | TIMESTAMP      | Дата регистрации           |

---

### mcc_codes

Справочник категорий. Заполняется из [db/seed_mcc_codes.sql](../db/seed_mcc_codes.sql).

| Колонка         | Тип           | Описание              |
|-----------------|---------------|-----------------------|
| `mcc_code`      | VARCHAR2(4) (PK) | 4-значный код      |
| `description_ru`| VARCHAR2(500) | Название по-русски    |
| `category`      | VARCHAR2(100) | Укрупнённая категория |

---

### merchants

Торговые точки. Первичный ключ Яндекса (`yandex_firm_id`) используется как внешний ID.  
Точки добавляются автоматически при голосовании (MERGE), а также через seed-скрипт.

| Колонка         | Тип            | Описание                     |
|-----------------|----------------|------------------------------|
| `id`            | NUMBER (PK)    | Auto-generated identity      |
| `yandex_firm_id`| VARCHAR2(100)  | Уникальный ID из Yandex/2GIS |
| `name`          | VARCHAR2(500)  | Название                     |
| `address`       | VARCHAR2(1000) | Адрес                        |
| `lat`           | NUMBER(10,7)   | Широта                       |
| `lon`           | NUMBER(10,7)   | Долгота                      |
| `created_at`    | TIMESTAMP      | Дата добавления              |

Индекс: `idx_merchants_yid` по `yandex_firm_id`.

---

### mcc_votes

Голоса пользователей.

| Колонка         | Тип           | Описание                     |
|-----------------|---------------|------------------------------|
| `id`            | NUMBER (PK)   | Auto-generated identity      |
| `merchant_id`   | NUMBER (FK)   | `merchants.id`               |
| `user_id`       | NUMBER (FK)   | `users.id`                   |
| `mcc_code`      | VARCHAR2(4) (FK) | `mcc_codes.mcc_code`      |
| `voted_at`      | TIMESTAMP     | Время голосования            |
| `purchase_date` | DATE          | Дата покупки (опционально)   |

Индексы: `idx_votes_merchant(merchant_id, voted_at DESC)`, `idx_votes_user(user_id)`.

---

## View: v_merchant_stats

Агрегирует данные по голосам для каждого мерчанта. Используется в `/merchants` и `/merchants/:id/stats`.

| Поле          | Описание                                    |
|---------------|---------------------------------------------|
| `last_mcc`    | MCC из последнего голоса                    |
| `top_mcc_30d` | Самый частый MCC за последние 30 дней       |
| `votes_total` | Всего голосов за мерчанта                   |
| `votes_30d`   | Голосов за последние 30 дней                |

---

## Подключение (thin mode)

oracledb v6.10 работает в thin mode — Oracle Instant Client не нужен.  
Wallet: `cwallet.sso` (auto-login, без пароля).

```js
// backend/src/db.js
oracledb.createPool({
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECT_STRING,
  walletLocation: process.env.ORACLE_WALLET_LOCATION,
  // walletPassword не нужен для cwallet.sso
});
```

## Seed-данные

```bash
# Запускать из директории backend/
node ../db/seed_spb.js
```

Добавляет 10 тестовых точек в Санкт-Петербурге (spb_001 … spb_010). При повторном запуске — пропускает существующие (ORA-00001 → SKIP).
