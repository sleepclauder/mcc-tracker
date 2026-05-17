# MCC Tracker Backend — Тестирование

## Стек

- **Runner:** Node.js built-in test runner (`node --test`) — нет лишних зависимостей
- **HTTP-тесты:** `supertest`
- **Моки:** встроенный `node:test` mock API

## Структура тестов

```
backend/src/
├── routes/
│   ├── auth.test.js        # регистрация, логин, невалидные данные
│   ├── merchants.test.js   # геопоиск, параметры
│   ├── votes.test.js       # голосование, дедупликация, auth guard
│   └── stats.test.js       # top_mcc, last_mcc, пустой магазин
├── middleware/
│   └── auth.test.js        # JWT валидный, истёкший, отсутствующий
└── services/
    └── mccService.test.js  # агрегация MCC-кодов
```

## Типы тестов

### Юнит-тесты (без БД)
- `mccService.test.js` — чистая логика агрегации, мокаем db
- `middleware/auth.test.js` — проверка JWT без сети

### Интеграционные тесты (с supertest, мокаем БД)
- `routes/*.test.js` — HTTP запросы к Express app, БД замокана

## Запуск

```bash
npm test                    # все тесты
npm run test:coverage       # с покрытием
node --test src/routes/auth.test.js   # один файл
```

## Что покрываем

| Модуль | Сценарии |
|---|---|
| `POST /auth/register` | успех, дубль email, невалидный email, короткий пароль |
| `POST /auth/login` | успех, неверный пароль, несуществующий пользователь |
| `GET /merchants` | с координатами, без параметров (400), невалидный radius |
| `GET /merchants/:id/stats` | с голосами, без голосов, несуществующий магазин |
| `POST /votes` | успех, без JWT (401), невалидный mcc_code |
| `mccService` | top_mcc по количеству, last_mcc по дате, пустой массив |
| JWT middleware | валидный токен, истёкший, отсутствующий, подделанный |

## CI

Тесты запускаются автоматически в GitHub Actions перед деплоем.
