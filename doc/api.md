# MCC Tracker — REST API

Base URL (prod): `https://checkback.duckdns.org/api`  
Base URL (local): `http://localhost:3000`

Все ответы в JSON. Защищённые маршруты требуют заголовок:
```
Authorization: Bearer <JWT>
```

---

## Auth

### POST /auth/register

Регистрация нового пользователя.

**Body:**
```json
{ "email": "user@example.com", "password": "min8chars" }
```

**Response 201:**
```json
{ "token": "<jwt>" }
```

**Ошибки:** 400 (валидация), 409 (email занят)

---

### POST /auth/login

Вход.

**Body:**
```json
{ "email": "user@example.com", "password": "..." }
```

**Response 200:**
```json
{ "token": "<jwt>" }
```

**Ошибки:** 400 (пустые поля), 401 (неверные данные)

---

## Merchants

### GET /merchants

Список торговых точек в радиусе от координат центра.

**Query params:**

| Параметр   | Обязателен | По умолчанию | Описание                     |
|------------|-----------|-------------|------------------------------|
| `lat`      | да        | —           | Широта центра                |
| `lon`      | да        | —           | Долгота центра               |
| `radius_m` | нет       | 1000        | Радиус в метрах (1–50 000)   |

**Response 200:** массив объектов
```json
[
  {
    "YANDEX_FIRM_ID": "spb_001",
    "NAME": "Пятёрочка",
    "ADDRESS": "Невский пр., 88",
    "LAT": 59.9311,
    "LON": 30.3609,
    "LAST_MCC": "5411",
    "TOP_MCC_30D": "5411",
    "VOTES_TOTAL": 5,
    "VOTES_30D": 2
  }
]
```

**Ошибки:** 400 (нет lat/lon или radius_m вне диапазона)

---

### GET /merchants/:yandex_firm_id/stats

Статистика по конкретному мерчанту.

**Response 200:** один объект того же формата, что в GET /merchants

**Ошибки:** 404 (мерчант не найден)

---

## Votes

### POST /votes *(требует JWT)*

Проголосовать за MCC-код для точки. Если мерчант не существует в БД — создаётся автоматически (MERGE).

**Body:**
```json
{
  "yandex_firm_id": "spb_001",
  "mcc_code": "5411",
  "name": "Пятёрочка",
  "address": "Невский пр., 88",
  "lat": 59.9311,
  "lon": 30.3609,
  "purchase_date": "2026-05-10"
}
```

Обязательны только `yandex_firm_id` и `mcc_code`.  
`mcc_code` должен быть ровно 4 цифры и присутствовать в справочнике `mcc_codes`.

**Response 201:**
```json
{ "ok": true }
```

**Ошибки:** 400 (валидация), 401 (нет токена / токен невалиден)

---

## Health

### GET /health

```json
{ "ok": true }
```
