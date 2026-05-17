# MCC Tracker — Handoff для следующей сессии

> Состояние на 2026-05-17. Читать этот файл в начале следующего чата.

---

## Что сделано (всё готово)

| Фаза | Статус |
|---|---|
| Phase 1 — OCI инфраструктура | ✅ VM + ATP созданы |
| Phase 2 — Настройка VM | ✅ Node.js, Nginx, PM2, swap, Oracle Wallet |
| Phase 3 — БД | ✅ Схема применена, 51 MCC code засеяны |
| Phase 4 — Backend | ✅ Задеплоен, 38 тестов проходят |
| Phase 5 — Frontend | ✅ Код написан, 32 теста проходят (не задеплоен) |
| CI/CD | ✅ GitHub Actions: тесты → SSH → pm2 reload → npm build |

### Проверено живое

```
http://147.5.126.225/api/health      → {"ok":true}
http://147.5.126.225/api/merchants   → []  (DB подключена, данных нет)
```

---

## Карта — 2GIS MapGL (решено)

Yandex Maps заменён на **2GIS MapGL** (`@2gis/mapgl`).

- Демо-ключ получен на 1 месяц (май 2026)
- `VITE_YMAPS_KEY` → `VITE_2GIS_KEY` в `.env`
- Yandex script убран из `index.html`, карта грузится через npm-пакет

---

## Следующие шаги (в порядке выполнения)

### Шаг 1 — npm install на VM (после git pull)

```bash
ssh -i ssh-key/ssh-key-2026-05-10.key ubuntu@147.5.126.225
cd /var/www/mcc-tracker/app/frontend
git pull origin main
npm install
```

### Шаг 2 — Создать frontend/.env на VM

```bash
cat > /var/www/mcc-tracker/app/frontend/.env << 'EOF'
VITE_API_URL=http://147.5.126.225/api
VITE_2GIS_KEY=<демо-ключ 2GIS>
EOF
```

### Шаг 3 — Собрать и задеплоить фронтенд

```bash
cd /var/www/mcc-tracker/app/frontend
npm install
npm run build
```

### Шаг 4 — Проверить Nginx

```bash
sudo nginx -t && sudo systemctl reload nginx
curl http://147.5.126.225/
```

Должен вернуть HTML страницы React.

### Шаг 5 — PM2 autostart при перезагрузке VM

```bash
pm2 startup
# скопировать и выполнить выведенную команду с sudo
pm2 save
```

### Шаг 6 — Обновить secrets/credentials.md (локально)

Добавить JWT секрет:
```
JWT_SECRET: 752ecd5fcc32da4135a22be2e80464f1680f314a89ac65976a40a4841b9162766794a194275a62d88efaecbaad19aa91
```

### Шаг 7 — End-to-end проверка

1. Открыть http://147.5.126.225
2. Зарегистрироваться → войти
3. Карта загружается, видны POI Яндекса
4. Нажать на магазин → VoteModal → проголосовать
5. Убедиться, что голос сохранён (перезагрузить страницу магазина)

---

## Ключевые пути и команды

### SSH на VM
```bash
ssh -i ssh-key/ssh-key-2026-05-10.key ubuntu@147.5.126.225
```

### PM2
```bash
pm2 status                        # состояние процессов
pm2 logs mcc-api --lines 50       # логи backend
pm2 reload mcc-api                # перезапуск без downtime
```

### Nginx
```bash
sudo nginx -t                     # проверка конфига
sudo systemctl reload nginx       # перезагрузка
sudo tail -f /var/log/nginx/error.log
```

### Git на VM
```bash
cd /var/www/mcc-tracker/app
git pull origin main
```

---

## Архитектура одной строкой

```
Браузер → Nginx :80 → /api/* → Node.js :3000 → Oracle ATP
                     → /*    → React (dist/)
```

---

## Структура проекта

```
mcc-tracker/
├── backend/
│   ├── src/
│   │   ├── app.js              # Express entry point
│   │   ├── db.js               # Oracle connection pool
│   │   ├── middleware/auth.js  # JWT verify
│   │   ├── routes/             # auth, merchants, votes, stats
│   │   └── services/mccService.js
│   ├── README.md
│   ├── TESTING.md
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/client.js       # axios + JWT interceptor
│   │   ├── hooks/              # useAuth, useMerchants
│   │   ├── components/         # Map, VoteModal, MerchantCard, MerchantList, AuthGuard
│   │   └── pages/              # MapPage, MerchantPage, LoginPage
│   ├── index.html              # подключает Yandex Maps JS API
│   └── vite.config.js
├── db/
│   ├── schema.sql
│   ├── seed_mcc_codes.sql
│   └── grants.sql
├── .github/workflows/deploy.yml
├── secrets/credentials.md      # GITIGNORED — все пароли
└── technical/
    ├── MVP-PLAN.md
    └── SESSION-HANDOFF.md      # этот файл
```

---

## Известные особенности / Fix'ы уже применены

| Проблема | Решение |
|---|---|
| VM 1GB RAM, OOM при npm install | Добавлен 1GB swap (/swapfile), постоянно через /etc/fstab |
| Oracle wallet NJS-125 | sqlnet.ora: DIRECTORY="/var/www/mcc-tracker/wallet" |
| node_modules в git | `git rm -r --cached` + .gitignore обновлён |
| Test: radius_m=0 | `req.query.radius_m !== undefined ? parseInt(...) : 1000` |
| Test: form submit jsdom | `fireEvent.submit(form)` вместо `click(button)` |
| Test: VoteModal overlay | `document.querySelector('.modal-overlay')` |
| Oracle VIEW ORA-06553 | scalar correlated subquery с FETCH FIRST 1 ROW ONLY |
