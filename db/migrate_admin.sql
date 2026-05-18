-- Run on VM with Oracle wallet configured:
--   NODE_PATH=backend/node_modules node -e "require('dotenv').config({path:'backend/.env'}); const db=require('./backend/src/db'); db.init().then(async()=>{ await db.execute(require('fs').readFileSync('db/migrate_admin.sql','utf8')); console.log('done'); process.exit(); })"
-- Or connect via SQL*Plus / SQL Developer and run manually.

ALTER TABLE users ADD is_admin NUMBER(1) DEFAULT 0 NOT NULL;
ALTER TABLE users ADD is_blocked NUMBER(1) DEFAULT 0 NOT NULL;
