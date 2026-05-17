# MCC Tracker Frontend — Тестирование

## Стек

- **Runner:** Vitest (нативная интеграция с Vite, без доп. конфига)
- **DOM:** @testing-library/react + @testing-library/user-event
- **Mocks:** `vi.mock` для axios и Yandex Maps
- **Среда:** jsdom

## Структура тестов

```
frontend/src/
├── utils/
│   └── auth.test.js            # localStorage token helpers
├── hooks/
│   ├── useAuth.test.jsx        # логин, логаут, персистентность
│   └── useMerchants.test.jsx   # геозапрос, загрузка, ошибки
├── components/
│   ├── MerchantCard.test.jsx   # рендер данных, ссылка
│   ├── MerchantList.test.jsx   # список, пустое состояние
│   ├── VoteModal.test.jsx      # выбор MCC, сабмит, закрытие
│   └── AuthGuard.test.jsx      # редирект без токена
└── pages/
    ├── LoginPage.test.jsx       # форма логина, переключение на регистрацию
    └── MerchantPage.test.jsx    # загрузка статистики, кнопка голоса
```

## Что покрываем

| Модуль | Сценарии |
|---|---|
| `auth.js` | getToken, setToken, removeToken, isAuthenticated |
| `useAuth` | логин сохраняет токен, логаут очищает, начальное состояние из localStorage |
| `useMerchants` | загрузка по координатам, состояние loading/error, пустой список |
| `MerchantCard` | отображает name/address/mcc, ссылка на /merchant/:id |
| `MerchantList` | список карточек, заглушка «ничего рядом» |
| `VoteModal` | отображает MCC-коды, submit вызывает API, закрывается после успеха |
| `AuthGuard` | рендерит children при наличии токена, редиректит на /login без него |
| `LoginPage` | переключение login↔register, валидация, вызов API |
| `MerchantPage` | показывает статистику, кнопка «Проголосовать» открывает VoteModal |

## Запуск

```bash
npm test              # watch mode
npm run test:run      # один прогон (для CI)
npm run test:coverage # с покрытием
```

## CI

Тесты запускаются в GitHub Actions перед деплоем (`npm run test:run`).
