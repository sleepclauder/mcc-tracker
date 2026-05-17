-- MCC Tracker — Схема базы данных
-- Oracle Autonomous Database (ATP)
-- Выполнять от имени пользователя MCCTRACKER
-- OCI → ATP → Database Actions → SQL

-- ============================================================
-- 1. Пользователи
-- ============================================================
CREATE TABLE users (
    id              NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email           VARCHAR2(255)   NOT NULL UNIQUE,
    password_hash   VARCHAR2(255)   NOT NULL,
    created_at      TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL
);

-- ============================================================
-- 2. Справочник MCC-кодов
-- ============================================================
CREATE TABLE mcc_codes (
    mcc_code        VARCHAR2(4)     PRIMARY KEY,
    description_ru  VARCHAR2(500)   NOT NULL,
    category        VARCHAR2(100)
);

-- ============================================================
-- 3. Магазины
-- Не храним весь каталог — только те точки, по которым есть голоса.
-- Основной идентификатор — yandex_firm_id (из Yandex Maps API).
-- lat/lon — кэш координат, чтобы не дёргать Яндекс лишний раз.
-- ============================================================
CREATE TABLE merchants (
    id              NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    yandex_firm_id  VARCHAR2(100)   NOT NULL UNIQUE,
    name            VARCHAR2(500),
    address         VARCHAR2(1000),
    lat             NUMBER(10,7),
    lon             NUMBER(10,7),
    created_at      TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL,
    gis_url         VARCHAR2(500),
    gis_rating      NUMBER(3,1),
    gis_review_count NUMBER DEFAULT 0,
    gis_fetched_at  TIMESTAMP
);

CREATE INDEX idx_merchants_yid ON merchants(yandex_firm_id);

-- ============================================================
-- 4. Голоса за MCC
-- ============================================================
CREATE TABLE mcc_votes (
    id              NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    merchant_id     NUMBER          NOT NULL REFERENCES merchants(id),
    user_id         NUMBER          NOT NULL REFERENCES users(id),
    mcc_code        VARCHAR2(4)     NOT NULL REFERENCES mcc_codes(mcc_code),
    voted_at        TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL,
    purchase_date   DATE
);

CREATE INDEX idx_votes_merchant ON mcc_votes(merchant_id, voted_at DESC);
CREATE INDEX idx_votes_user     ON mcc_votes(user_id);

-- ============================================================
-- 5. View: статистика по магазину
-- last_mcc      — последний проголосованный код
-- top_mcc_30d   — самый популярный код за 30 дней
-- votes_total   — всего голосов
-- votes_30d     — голосов за 30 дней
-- ============================================================
CREATE OR REPLACE VIEW v_merchant_stats AS
SELECT
    m.id,
    m.yandex_firm_id,
    m.name,
    m.address,
    m.lat,
    m.lon,
    m.gis_url,
    m.gis_rating,
    m.gis_review_count,
    m.gis_fetched_at,
    -- Последний проголосованный MCC
    (SELECT v.mcc_code
     FROM   mcc_votes v
     WHERE  v.merchant_id = m.id
     ORDER  BY v.voted_at DESC
     FETCH FIRST 1 ROW ONLY
    ) AS last_mcc,
    -- Топ MCC за последние 30 дней
    (SELECT v2.mcc_code
     FROM   mcc_votes v2
     WHERE  v2.merchant_id = m.id
     AND    v2.voted_at >= SYSTIMESTAMP - INTERVAL '30' DAY
     GROUP  BY v2.mcc_code
     ORDER  BY COUNT(*) DESC
     FETCH FIRST 1 ROW ONLY
    ) AS top_mcc_30d,
    -- Количество голосов всего
    (SELECT COUNT(*)
     FROM   mcc_votes v
     WHERE  v.merchant_id = m.id
    ) AS votes_total,
    -- Количество голосов за 30 дней
    (SELECT COUNT(*)
     FROM   mcc_votes v
     WHERE  v.merchant_id = m.id
     AND    v.voted_at >= SYSTIMESTAMP - INTERVAL '30' DAY
    ) AS votes_30d
FROM merchants m;
