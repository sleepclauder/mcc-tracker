'use strict';
const express = require('express');
const requireAuth = require('../middleware/auth');

module.exports = function makeVotesRouter(db) {
  const router = express.Router();

  router.post('/', requireAuth, async (req, res) => {
    const { yandex_firm_id, name, address, lat, lon, mcc_code, purchase_date } = req.body;

    if (!yandex_firm_id || !mcc_code) {
      return res.status(400).json({ error: 'yandex_firm_id and mcc_code required' });
    }
    if (!/^\d{4}$/.test(mcc_code)) {
      return res.status(400).json({ error: 'mcc_code must be 4 digits' });
    }

    try {
      const mccCheck = await db.execute(
        'SELECT mcc_code FROM mcc_codes WHERE mcc_code = :mcc_code',
        { mcc_code }
      );
      if (!mccCheck.rows.length) return res.status(400).json({ error: 'unknown mcc_code' });

      await db.execute(
        `MERGE INTO merchants dst
         USING (SELECT :yandex_firm_id AS yid, :name AS nm, :address AS addr,
                       :lat AS lt, :lon AS ln FROM DUAL) src
         ON (dst.yandex_firm_id = src.yid)
         WHEN NOT MATCHED THEN
           INSERT (yandex_firm_id, name, address, lat, lon)
           VALUES (src.yid, src.nm, src.addr, src.lt, src.ln)`,
        { yandex_firm_id, name: name || null, address: address || null, lat: lat || null, lon: lon || null }
      );

      const merchant = await db.execute(
        'SELECT id FROM merchants WHERE yandex_firm_id = :yandex_firm_id',
        { yandex_firm_id }
      );
      const merchant_id = merchant.rows[0].ID;

      const recentVote = await db.execute(
        `SELECT COUNT(*) AS cnt FROM mcc_votes
         WHERE user_id = :userId AND merchant_id = :merchantId
           AND created_at > SYSDATE - 1`,
        { userId: req.user.id, merchantId: merchant_id }
      );
      if (recentVote.rows[0].CNT > 0) {
        return res.status(429).json({ error: 'already voted today for this merchant' });
      }

      await db.execute(
        `INSERT INTO mcc_votes (merchant_id, user_id, mcc_code, purchase_date)
         VALUES (:merchant_id, :user_id, :mcc_code, :purchase_date)`,
        {
          merchant_id,
          user_id: req.user.id,
          mcc_code,
          purchase_date: purchase_date ? new Date(purchase_date) : null,
        }
      );

      res.status(201).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'server error' });
    }
  });

  return router;
};
