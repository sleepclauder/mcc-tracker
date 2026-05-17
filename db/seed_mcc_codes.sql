-- MCC Tracker — Справочник MCC-кодов
-- Наиболее частые коды в ритейле России (MVP-набор)

-- Продукты и супермаркеты
INSERT INTO mcc_codes VALUES ('5411', 'Продуктовые магазины и супермаркеты', 'Продукты');
INSERT INTO mcc_codes VALUES ('5422', 'Замороженные продукты', 'Продукты');
INSERT INTO mcc_codes VALUES ('5441', 'Кондитерские магазины', 'Продукты');
INSERT INTO mcc_codes VALUES ('5451', 'Молочные продукты', 'Продукты');
INSERT INTO mcc_codes VALUES ('5462', 'Пекарни', 'Продукты');
INSERT INTO mcc_codes VALUES ('5499', 'Прочие продуктовые магазины', 'Продукты');

-- Рестораны и кафе
INSERT INTO mcc_codes VALUES ('5812', 'Рестораны и кафе', 'Рестораны');
INSERT INTO mcc_codes VALUES ('5814', 'Фастфуд', 'Рестораны');
INSERT INTO mcc_codes VALUES ('5811', 'Столовые и буфеты', 'Рестораны');
INSERT INTO mcc_codes VALUES ('5813', 'Бары и алкогольные магазины', 'Рестораны');

-- Здоровье и красота
INSERT INTO mcc_codes VALUES ('5912', 'Аптеки и фармацевтика', 'Здоровье');
INSERT INTO mcc_codes VALUES ('5047', 'Медицинское оборудование', 'Здоровье');
INSERT INTO mcc_codes VALUES ('7298', 'Спа и салоны красоты', 'Красота');
INSERT INTO mcc_codes VALUES ('5977', 'Косметика и парфюмерия', 'Красота');
INSERT INTO mcc_codes VALUES ('7230', 'Парикмахерские', 'Красота');

-- Одежда и обувь
INSERT INTO mcc_codes VALUES ('5311', 'Универмаги', 'Одежда');
INSERT INTO mcc_codes VALUES ('5651', 'Магазины одежды', 'Одежда');
INSERT INTO mcc_codes VALUES ('5661', 'Обувные магазины', 'Одежда');
INSERT INTO mcc_codes VALUES ('5699', 'Прочие магазины одежды', 'Одежда');
INSERT INTO mcc_codes VALUES ('5621', 'Женская одежда', 'Одежда');
INSERT INTO mcc_codes VALUES ('5611', 'Мужская одежда', 'Одежда');
INSERT INTO mcc_codes VALUES ('5641', 'Детская одежда', 'Одежда');

-- Электроника и техника
INSERT INTO mcc_codes VALUES ('5732', 'Магазины электроники', 'Электроника');
INSERT INTO mcc_codes VALUES ('5734', 'Компьютеры и ПО', 'Электроника');
INSERT INTO mcc_codes VALUES ('5065', 'Электротовары', 'Электроника');
INSERT INTO mcc_codes VALUES ('5045', 'Компьютеры и оргтехника', 'Электроника');

-- АЗС и транспорт
INSERT INTO mcc_codes VALUES ('5541', 'Автозаправочные станции', 'АЗС');
INSERT INTO mcc_codes VALUES ('5542', 'Автоматические АЗС', 'АЗС');
INSERT INTO mcc_codes VALUES ('5571', 'Мотоциклы', 'Транспорт');
INSERT INTO mcc_codes VALUES ('5511', 'Автосалоны', 'Транспорт');
INSERT INTO mcc_codes VALUES ('7523', 'Парковки', 'Транспорт');
INSERT INTO mcc_codes VALUES ('4111', 'Городской транспорт', 'Транспорт');
INSERT INTO mcc_codes VALUES ('4121', 'Такси', 'Транспорт');

-- Дом и строительство
INSERT INTO mcc_codes VALUES ('5251', 'Хозяйственные магазины', 'Дом');
INSERT INTO mcc_codes VALUES ('5200', 'Строительные магазины', 'Дом');
INSERT INTO mcc_codes VALUES ('5712', 'Мебельные магазины', 'Дом');
INSERT INTO mcc_codes VALUES ('5719', 'Товары для дома', 'Дом');
INSERT INTO mcc_codes VALUES ('5714', 'Ковры и покрытия', 'Дом');
INSERT INTO mcc_codes VALUES ('5722', 'Бытовая техника', 'Дом');

-- Спорт и отдых
INSERT INTO mcc_codes VALUES ('5941', 'Спортивные магазины', 'Спорт');
INSERT INTO mcc_codes VALUES ('7997', 'Фитнес-клубы', 'Спорт');
INSERT INTO mcc_codes VALUES ('7999', 'Развлечения и отдых', 'Спорт');
INSERT INTO mcc_codes VALUES ('7832', 'Кинотеатры', 'Развлечения');
INSERT INTO mcc_codes VALUES ('7922', 'Театры и концерты', 'Развлечения');

-- Финансы и прочее
INSERT INTO mcc_codes VALUES ('6010', 'Банки и финансовые организации', 'Финансы');
INSERT INTO mcc_codes VALUES ('6011', 'Банкоматы', 'Финансы');
INSERT INTO mcc_codes VALUES ('5999', 'Прочие магазины', 'Прочее');
INSERT INTO mcc_codes VALUES ('5310', 'Магазины-дискаунтеры', 'Прочее');
INSERT INTO mcc_codes VALUES ('5331', 'Магазины всё по одной цене', 'Прочее');
INSERT INTO mcc_codes VALUES ('7011', 'Гостиницы и отели', 'Проживание');

COMMIT;
