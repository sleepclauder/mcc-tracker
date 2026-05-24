'use strict';
const express = require('express');
const requireAuth = require('../middleware/auth');

module.exports = function makeNoTerminalRouter(db) {
  const router = express.Router();

  // POST /merchants/:yandex_firm_id/no-terminal — toggle report for current user
  router.post('/:yandex_firm_id/no-terminal', requireAuth, async (req, res) => {
    const { yandex_firm_id } = req.params;
    const userId = req.user.id;

    try {
      const existing = await db.execute(
        `SELECT id FROM no_terminal_reports
         WHERE merchant_yandex_firm_id = :yandex_firm_id AND user_id = :userId`,
        { yandex_firm_id, userId }
      );

      let reported;
      if (existing.rows.length > 0) {
        await db.execute(
          `DELETE FROM no_terminal_reports
           WHERE merchant_yandex_firm_id = :yandex_firm_id AND user_id = :userId`,
          { yandex_firm_id, userId }
        );
        reported = false;
      } else {
        await db.execute(
          `INSERT INTO no_terminal_reports (merchant_yandex_firm_id, user_id)
           VALUES (:yandex_firm_id, :userId)`,
          { yandex_firm_id, userId }
        );
        reported = true;
      }

      const countResult = await db.execute(
        `SELECT COUNT(*) AS cnt FROM no_terminal_reports
         WHERE merchant_yandex_firm_id = :yandex_firm_id`,
        { yandex_firm_id }
      );

      res.json({ reported, count: countResult.rows[0].CNT });
    } catch (e) {
      console.error('[no-terminal POST]', e);
      res.status(500).json({ error: 'server error' });
    }
  });

  return router;
};
