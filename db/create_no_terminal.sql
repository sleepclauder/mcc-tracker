-- Run on VM: NODE_PATH=backend/node_modules node -e "require('./backend/src/db').init().then(db => db.execute(require('fs').readFileSync('db/create_no_terminal.sql','utf8')))"
-- Or paste directly into SQL Developer / Oracle Cloud SQL Worksheet

CREATE TABLE no_terminal_reports (
  id                      NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  merchant_yandex_firm_id VARCHAR2(100) NOT NULL,
  user_id                 NUMBER NOT NULL,
  created_at              TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT uq_no_terminal UNIQUE (merchant_yandex_firm_id, user_id),
  CONSTRAINT fk_no_terminal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
