-- MCC Tracker — Права на объекты
-- Выполнять от имени ADMIN после создания пользователя MCCTRACKER
-- OCI → ATP → Database Actions → SQL

-- ============================================================
-- 1. Создание пользователя (если ещё не создан)
-- ============================================================
-- CREATE USER mcctracker IDENTIFIED BY "<PASSWORD>";
-- ALTER USER mcctracker QUOTA UNLIMITED ON DATA;

-- ============================================================
-- 2. Системные права для Node.js-подключения
-- ============================================================
GRANT CREATE SESSION TO mcctracker;

-- ============================================================
-- 3. Права на таблицы (Node.js подключается от имени MCCTRACKER,
--    поэтому если схема и пользователь совпадают — дополнительных
--    грантов не нужно. Эти гранты нужны если Node.js подключается
--    от другого пользователя, например APP_USER)
-- ============================================================

-- Пример: если создашь отдельного пользователя APP_USER для Node.js
-- GRANT SELECT, INSERT, UPDATE, DELETE ON mcctracker.users TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON mcctracker.merchants TO app_user;
-- GRANT SELECT, INSERT ON mcctracker.mcc_votes TO app_user;
-- GRANT SELECT ON mcctracker.mcc_codes TO app_user;
-- GRANT SELECT ON mcctracker.v_merchant_stats TO app_user;

-- ============================================================
-- 4. Права на sequences (для GENERATED ALWAYS AS IDENTITY)
-- ============================================================
-- Автоматически доступны владельцу схемы — дополнительных грантов нет.

-- ============================================================
-- Итог для MVP:
-- Node.js подключается напрямую как MCCTRACKER — отдельных грантов не нужно.
-- Если в будущем разделишь пользователей (read-only replica, analytics и т.д.)
-- — раскомментируй блок выше с APP_USER.
-- ============================================================
