'use strict';
const express = require('express');

module.exports = function makeStatsRouter(db) {
  const router = express.Router();

  router.get('/:yandex_firm_id/stats', async (req, res) => {
    const { yandex_firm_id } = req.params;
    try {
      const result = await db.execute(
        `SELECT s.yandex_firm_id, s.name, s.address, s.lat, s.lon,
                s.last_mcc, s.top_mcc_30d, s.votes_total, s.votes_30d
         FROM v_merchant_stats s
         WHERE s.yandex_firm_id = :yandex_firm_id`,
        { yandex_firm_id }
      );
      if (!result.rows.length) return res.status(404).json({ error: 'merchant not found' });
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ error: 'server error' });
    }
  });

  return router;
};
