# MCC Tracker — Frontend

React 18 SPA, сборщик Vite, маршрутизация React Router v6.  
Тесты: Vitest + @testing-library/react.

---

## Маршруты

| URL                          | Компонент      | Доступ   |
|------------------------------|---------------|----------|
| `/`                          | MapPage       | Все      |
| `/merchant/:yandex_firm_id`  | MerchantPage  | Все      |
| `/login`                     | LoginPage     | Все      |

---

## Pages

### MapPage (`src/pages/MapPage.jsx`)

Главная страница с картой и боковым списком мерчантов.

**Состояние:**
- `center {lat, lon}` — текущий центр карты, передаётся в `useMerchants` для загрузки точек
- `flyTo {lat, lon}` — команда сдвига камеры для `Map` (геолокация / выбор города)
- `userLocation {lat, lon}` — координаты пользователя; при наличии `Map` рисует маркер-человечка
- `hoveredMerchant` — мерчант под курсором, отображается в tooltip поверх карты
- `geoStatus` — `'idle' | 'loading' | 'denied'`
- `toast {message, type}` — текущий тост; `null` когда скрыт

**Функции:**
- `moveTo(lat, lon)` — обновляет `center` и `flyTo` одновременно
- `requestGeolocation()` — вызывает Geolocation API; при успехе сохраняет `userLocation` и вызывает `moveTo`; при отказе показывает error-тост с причиной (`navigator.geolocation` недоступен = HTTP, иначе = заблокировано пользователем)
- `handleCenterChange(lat, lon)` — коллбек от `Map` при перемещении карты; обновляет только `center`
- `handleCitySelect(e)` — находит город по имени и вызывает `moveTo`

Геолокация запрашивается автоматически при монтировании (`useEffect`), если `center.lat === null`.

---

### MerchantPage (`src/pages/MerchantPage.jsx`)

Детальная страница мерчанта: название, адрес, статистика MCC, кнопка «Добавить MCC».  
При нажатии на кнопку открывается `VoteModal`.

---

### LoginPage (`src/pages/LoginPage.jsx`)

Форма входа / регистрации. Использует `useAuth().login` и `useAuth().register`.

---

## Components

### Map (`src/components/Map.jsx`)

Обёртка над 2GIS MapGL.

**Props:**

| Prop              | Тип          | Описание                                             |
|-------------------|--------------|------------------------------------------------------|
| `onCenterChange`  | function     | `(lat, lon) => void` — вызывается при `moveend`      |
| `merchants`       | array        | Список мерчантов для отображения маркерами           |
| `onMerchantHover` | function     | `(merchant | null) => void` — наведение на маркер    |
| `flyTo`           | `{lat, lon}` | При изменении — плавно перемещает камеру             |
| `userLocation`    | `{lat, lon}` | Координаты пользователя; рисует синий маркер-человечка |

**Внутренняя механика:**
- `mapInstanceRef` — хранит `{ map, mapgl }` после инициализации
- `merchantsRef` — актуальный список мерчантов (через ref, чтобы не пересоздавать эффект)
- `onMerchantHoverRef` — аналогично для коллбека
- `userMarkerRef` — маркер текущего местоположения пользователя; пересоздаётся при каждом изменении `userLocation`
- `renderMarkers()` — уничтожает старые маркеры и создаёт новые; вызывается при загрузке карты и при изменении `merchants`
- Клик по маркеру → `navigate('/merchant/:yandex_firm_id')`
- Cleanup при unmount: уничтожает все маркеры, `userMarkerRef` и карту

---

### MerchantList (`src/components/MerchantList.jsx`)

Список карточек мерчантов в боковой панели. Показывает состояния загрузки и ошибки.

### MerchantCard (`src/components/MerchantCard.jsx`)

Карточка одного мерчанта: имя, адрес, MCC-бейджи (последний + топ за 30д), кол-во голосов.  
Клик → переход на `/merchant/:yandex_firm_id`.

### Toast (`src/components/Toast.jsx`)

Всплывающее уведомление внизу экрана. Автоматически скрывается через 3 с (5 с для ошибок).

| Prop      | Тип      | По умолчанию | Описание                          |
|-----------|----------|-------------|-----------------------------------|
| `message` | string   | —           | Текст уведомления                 |
| `onDone`  | function | —           | Коллбек при скрытии               |
| `type`    | string   | `'success'` | `'success'` или `'error'`         |

CSS-модификатор `.toast--error` — красный фон, ширина до 360 px.

---

### VoteModal (`src/components/VoteModal.jsx`)

Модальное окно выбора MCC. Получает список кодов из `mccService`, отправляет голос через `POST /votes`.

### AuthGuard (`src/components/AuthGuard.jsx`)

Редирект на `/login`, если пользователь не аутентифицирован.

---

## Hooks

### useMerchants (`src/hooks/useMerchants.js`)

```js
const { merchants, loading, error } = useMerchants(lat, lon, radiusM = 1000);
```

Загружает мерчантов через `GET /merchants` при изменении `lat`/`lon`. Не делает запрос, пока `lat` или `lon` равны `null`. Отменяет устаревшие запросы через флаг `cancelled`.

### useAuth (`src/hooks/useAuth.js`)

```js
const { authenticated, login, register, logout } = useAuth();
```

Управляет JWT: сохраняет в `localStorage` через `utils/auth.js`. `authenticated` — реактивный флаг.

---

## Utils

### mcc.js (`src/utils/mcc.js`)

| Экспорт             | Описание                                                             |
|---------------------|----------------------------------------------------------------------|
| `MCC_LABELS`        | Словарь `mcc → название` (рус.)                                      |
| `MCC_ICONS`         | Словарь `mcc → emoji`                                                |
| `mccLabel(code)`    | Форматирует код: `"Продукты (5411)"` или просто код если нет метки   |
| `markerIcon(mcc)`   | SVG data URI — цветной круг с emoji для маркера мерчанта             |
| `userLocationIcon()`| SVG data URI — синий круг с силуэтом человечка для маркера пользователя |

---

## API Client (`src/api/client.js`)

Axios instance с базовым URL из `VITE_API_URL`. Автоматически добавляет `Authorization: Bearer <token>` из localStorage.

---

## Запуск локально

```bash
cd frontend
cp .env.example .env   # заполнить VITE_API_URL и VITE_2GIS_KEY
npm install
npm run dev            # http://localhost:5173
npm test               # Vitest
npm run build          # dist/
```

## Deploy на VM

```bash
git pull
cd frontend
npm install
npm run build          # пишет в frontend/dist/
# Nginx отдаёт dist/ как статику
```
