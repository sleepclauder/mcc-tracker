# MCC Tracker — Frontend

React + Vite SPA с интеграцией Yandex Maps JS API v3.

## Стек

- **Framework:** React 18
- **Build:** Vite 5
- **Router:** React Router v6
- **HTTP:** axios
- **Карта:** Yandex Maps JS API v3
- **Тесты:** Vitest + React Testing Library

## Структура

```
frontend/
├── src/
│   ├── main.jsx                # точка входа
│   ├── App.jsx                 # роутер, auth context
│   ├── api/
│   │   └── client.js           # axios instance с JWT
│   ├── pages/
│   │   ├── MapPage.jsx         # главная: карта + список магазинов
│   │   ├── MerchantPage.jsx    # карточка магазина + голосование
│   │   ├── LoginPage.jsx       # логин / регистрация
│   │   └── ProfilePage.jsx     # история голосов пользователя
│   ├── components/
│   │   ├── Map.jsx             # Yandex Maps обёртка
│   │   ├── MerchantList.jsx    # список рядом с метками MCC
│   │   ├── MerchantCard.jsx    # одна карточка в списке
│   │   ├── VoteModal.jsx       # модалка выбора MCC-кода
│   │   └── AuthGuard.jsx       # редирект на /login если нет токена
│   ├── hooks/
│   │   ├── useAuth.js          # токен, логин, логаут
│   │   └── useMerchants.js     # запрос магазинов по геопозиции
│   └── utils/
│       └── auth.js             # localStorage helpers
├── index.html
├── vite.config.js
└── package.json
```

## Страницы

| Путь | Компонент | Описание |
|---|---|---|
| `/` | `MapPage` | Карта + список магазинов рядом |
| `/merchant/:yandex_firm_id` | `MerchantPage` | MCC-статистика + кнопка голоса |
| `/login` | `LoginPage` | Логин / регистрация (переключение) |
| `/profile` | `ProfilePage` | История голосов (требует auth) |

## Yandex Maps API

Ключ задаётся через переменную окружения `VITE_YMAPS_KEY`.
API грузится через `<script>` в `index.html`.

Логика работы с картой:
- При движении карты → запрос к Yandex Maps за POI (организациями)
- При клике на POI → запрос к нашему API за MCC-статистикой по `yandex_firm_id`
- Магазины без голосов в нашей БД не хранятся — только обогащённые

## Переменные окружения

```env
VITE_API_URL=http://147.5.126.225/api
VITE_YMAPS_KEY=<ключ с developer.tech.yandex.ru>
```

## Установка и запуск

```bash
cp .env.example .env
# Заполнить VITE_YMAPS_KEY

npm install
npm run dev       # dev сервер на :5173
npm run build     # prod сборка в dist/
npm test          # тесты
```

## Деплой

Автоматически через GitHub Actions:
`npm run build` → `dist/` отдаётся Nginx с VM.
