# ЧекБэк — Android App Plan (Capacitor)

## Статус

| Задача | Статус |
|--------|--------|
| Capacitor установлен | ✅ |
| Android-проект сгенерирован | ✅ |
| Геолокация (нативный плагин) | ✅ |
| Иконка приложения (все плотности) | ✅ |
| Splash screen (все ориентации) | ✅ |
| HTTPS (`checkback.duckdns.org`) | ✅ |
| Название приложения «ЧекБэк» | ✅ |
| Первый debug APK собран | ✅ |
| Release APK / Google Play | ⏳ |

---

## Конфигурация

**`frontend/capacitor.config.json`**
```json
{
  "appId": "ru.mcctracker.app",
  "appName": "ЧекБэк",
  "webDir": "dist",
  "server": { "androidScheme": "https" }
}
```

**`frontend/.env.production`**
```
VITE_API_URL=https://checkback.duckdns.org/api
```

---

## Установленные пакеты

```bash
@capacitor/core
@capacitor/cli
@capacitor/android
@capacitor/geolocation     # нативная геолокация вместо navigator.geolocation

# dev-зависимости для генерации иконок:
@capacitor/assets
@resvg/resvg-js
```

---

## Структура файлов

```
frontend/
  capacitor.config.json          ← конфиг Capacitor (appId, appName, webDir)
  .env.production                ← VITE_API_URL=https://checkback.duckdns.org/api
  assets/
    icon.svg                     ← исходник иконки 1024×1024
    icon-only.png                ← растеризованный PNG (генерируется скриптом)
  scripts/
    gen-icon.js                  ← SVG → PNG через @resvg/resvg-js
  android/                       ← в .gitignore, генерируется командами ниже
    app/src/main/
      AndroidManifest.xml        ← разрешения: INTERNET, ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION
      res/
        values/strings.xml       ← app_name = ЧекБэк
        mipmap-*/                ← иконки всех плотностей (ldpi→xxxhdpi)
        drawable*/               ← splash screen (порт/ландшафт, светлая/тёмная тема)
```

---

## Workflow: первая настройка после git clone

```bash
cd frontend
npm install
npm run build
npx cap add android
node scripts/gen-icon.js                         # генерирует assets/icon-only.png
npx capacitor-assets generate --assetPath assets \
  --iconBackgroundColor "#e53935" \
  --iconBackgroundColorDark "#e53935" \
  --splashBackgroundColor "#e53935"
npx cap sync android
# Исправить strings.xml: app_name → ЧекБэк
npx cap open android                             # открыть в Android Studio
```

---

## Workflow: после изменений во фронтенде

```bash
cd frontend
npm run build
npx cap sync android
# Android Studio → Build → Build APK(s)
```

---

## Сборка APK

### Debug APK (для тестирования)

1. Открыть проект: `npx cap open android`
2. Дождаться Gradle sync
3. **Build → Build Bundle(s) / APK(s) → Build APK(s)**

Готовый файл:
```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

Установка через adb:
```bash
adb install frontend/android/app/build/outputs/apk/debug/app-debug.apk
```
Или скопировать APK на телефон → открыть → разрешить «Установку из неизвестных источников».

### Release APK (для Google Play / публичной раздачи)

1. **Build → Generate Signed Bundle / APK → APK**
2. Создать keystore (один раз — без него нельзя обновить приложение в Play Store)
3. Выбрать **release**

Готовый файл:
```
frontend/android/app/build/outputs/apk/release/app-release.apk
```

---

## Android Studio

- Версия: **Android Studio Panda** (2024.1.x)
- Скачать: https://developer.android.com/studio
- SDK: устанавливается через **File → Settings → Android SDK → Edit**

---

## Геолокация

Использует `@capacitor/geolocation` вместо `navigator.geolocation`:
- На Android запрашивает нативное разрешение у пользователя
- В браузере работает как обычный web API (graceful fallback)
- Разрешения в `AndroidManifest.xml`: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`

Тесты: `frontend/src/pages/MapPage.test.jsx` — 5 тест-кейсов покрывают порядок вызовов, успех и ошибки.

---

## HTTPS

API работает через `https://checkback.duckdns.org` (DuckDNS + Let's Encrypt на VM).
`network_security_config` и `allowMixedContent` **не нужны** — всё через HTTPS.

---

## Потенциальные доработки

| Задача | Приоритет | Описание |
|--------|-----------|----------|
| Google Play — Release APK | Средний | Keystore + Store listing |
| Push-уведомления | Низкий | `@capacitor/push-notifications` |
| iOS | Низкий | `npx cap add ios` — нужен Mac + Apple Developer аккаунт |
