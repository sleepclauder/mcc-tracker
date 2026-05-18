'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth',      require('./routes/auth')(db));
app.use('/merchants', require('./routes/merchants')(db));
app.use('/merchants', require('./routes/stats')(db));
app.use('/votes',     require('./routes/votes')(db));
app.use('/cards',     require('./routes/cards')(db));
app.use('/gis',       require('./routes/gis')());
app.use('/admin',     require('./routes/admin')(db));

app.get('/health', (req, res) => res.json({ ok: true }));

async function start() {
  await db.init();
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`API listening on :${port}`));
}

if (require.main === module) start();

module.exports = app;
