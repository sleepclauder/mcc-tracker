'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = function makeAuthRouter(db) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'invalid email' });
    if (password.length < 8) return res.status(400).json({ error: 'password min 8 chars' });

    try {
      const existing = await db.execute('SELECT id FROM users WHERE email = :email', { email });
      if (existing.rows.length) return res.status(409).json({ error: 'email already registered' });

      const hash = await bcrypt.hash(password, 10);
      const result = await db.execute(
        'INSERT INTO users (email, password_hash) VALUES (:email, :hash) RETURNING id INTO :id',
        { email, hash, id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER } }
      );
      const userId = result.outBinds.id[0];
      const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ token });
    } catch (e) {
      res.status(500).json({ error: 'server error' });
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    try {
      const result = await db.execute(
        'SELECT id, email, password_hash FROM users WHERE email = :email',
        { email }
      );
      const user = result.rows[0];
      if (!user) return res.status(401).json({ error: 'invalid credentials' });

      const ok = await bcrypt.compare(password, user.PASSWORD_HASH);
      if (!ok) return res.status(401).json({ error: 'invalid credentials' });

      const token = jwt.sign({ id: user.ID, email: user.EMAIL }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.json({ token });
    } catch (e) {
      res.status(500).json({ error: 'server error' });
    }
  });

  return router;
};
