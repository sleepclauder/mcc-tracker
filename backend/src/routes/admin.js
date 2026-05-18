'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

const PAGE_SIZE = 20;

module.exports = function makeAdminRouter(db) {
  const router = express.Router();
  router.use(requireAuth, requireAdmin);

  // GET /admin/users?q=&offset=
  router.get('/users', async (req, res) => {
    const q = `%${(req.query.q || '').trim()}%`;
    const offset = Math.max(0, parseInt(req.query.offset) || 0);

    try {
      const [listResult, countResult] = await Promise.all([
        db.execute(
          `SELECT u.id, u.email, u.created_at, u.is_admin, u.is_blocked,
                  COUNT(v.id) AS vote_count
           FROM users u
           LEFT JOIN mcc_votes v ON v.user_id = u.id
           WHERE LOWER(u.email) LIKE LOWER(:q)
           GROUP BY u.id, u.email, u.created_at, u.is_admin, u.is_blocked
           ORDER BY u.created_at DESC
           OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
          { q, offset, limit: PAGE_SIZE }
        ),
        db.execute(
          `SELECT COUNT(*) AS total FROM users WHERE LOWER(email) LIKE LOWER(:q)`,
          { q }
        ),
      ]);

      res.json({
        users: listResult.rows,
        total: countResult.rows[0].TOTAL,
        offset,
        limit: PAGE_SIZE,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'server error' });
    }
  });

  // GET /admin/users/:id/votes?offset=
  router.get('/users/:id/votes', async (req, res) => {
    const userId = parseInt(req.params.id);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);

    try {
      const [listResult, countResult] = await Promise.all([
        db.execute(
          `SELECT v.id, v.mcc_code, v.created_at, m.name, m.address
           FROM mcc_votes v
           JOIN merchants m ON v.merchant_id = m.id
           WHERE v.user_id = :userId
           ORDER BY v.created_at DESC
           OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
          { userId, offset, limit: PAGE_SIZE }
        ),
        db.execute(
          `SELECT COUNT(*) AS total FROM mcc_votes WHERE user_id = :userId`,
          { userId }
        ),
      ]);

      res.json({
        votes: listResult.rows,
        total: countResult.rows[0].TOTAL,
        offset,
        limit: PAGE_SIZE,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'server error' });
    }
  });

  // PUT /admin/users/:id
  router.put('/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'cannot edit own account' });
    }

    const { email, password, is_admin, is_blocked } = req.body;

    try {
      const check = await db.execute(
        'SELECT id FROM users WHERE id = :userId',
        { userId }
      );
      if (!check.rows.length) return res.status(404).json({ error: 'not found' });

      if (email) {
        const dup = await db.execute(
          'SELECT id FROM users WHERE email = :email AND id != :userId',
          { email, userId }
        );
        if (dup.rows.length) return res.status(409).json({ error: 'email already taken' });
      }

      const sets = [];
      const binds = { userId };

      if (email) { sets.push('email = :email'); binds.email = email; }
      if (password) {
        sets.push('password_hash = :hash');
        binds.hash = await bcrypt.hash(password, 10);
      }
      if (is_admin !== undefined) { sets.push('is_admin = :isAdmin'); binds.isAdmin = is_admin ? 1 : 0; }
      if (is_blocked !== undefined) { sets.push('is_blocked = :isBlocked'); binds.isBlocked = is_blocked ? 1 : 0; }

      if (!sets.length) return res.status(400).json({ error: 'nothing to update' });

      await db.execute(
        `UPDATE users SET ${sets.join(', ')} WHERE id = :userId`,
        binds
      );

      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'server error' });
    }
  });

  // DELETE /admin/users/:id
  router.delete('/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'cannot delete own account' });
    }

    try {
      const check = await db.execute(
        'SELECT id FROM users WHERE id = :userId',
        { userId }
      );
      if (!check.rows.length) return res.status(404).json({ error: 'not found' });

      await db.transaction(async (exec) => {
        await exec(
          `DELETE FROM card_cashback_rules
           WHERE card_id IN (SELECT id FROM user_cards WHERE user_id = :userId)`,
          { userId }
        );
        await exec('DELETE FROM user_cards WHERE user_id = :userId', { userId });
        await exec('DELETE FROM mcc_votes WHERE user_id = :userId', { userId });
        await exec('DELETE FROM users WHERE id = :userId', { userId });
      });

      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'server error' });
    }
  });

  return router;
};
