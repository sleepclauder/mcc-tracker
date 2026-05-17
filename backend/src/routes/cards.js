'use strict';
const express = require('express');
const requireAuth = require('../middleware/auth');

const VALID_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const validPct = (n) => typeof n === 'number' && n > 0 && n <= 100;

module.exports = function makeCardsRouter(db) {
  const router = express.Router();
  router.use(requireAuth);

  // GET /cards — list user's cards
  router.get('/', async (req, res) => {
    try {
      const result = await db.execute(
        `SELECT id, bank_name, card_name FROM user_cards
         WHERE user_id = :userId ORDER BY created_at`,
        { userId: req.user.id }
      );
      res.json(result.rows.map(r => ({
        id: r.ID, bank_name: r.BANK_NAME, card_name: r.CARD_NAME,
      })));
    } catch { res.status(500).json({ error: 'server error' }); }
  });

  // POST /cards — add a card
  router.post('/', async (req, res) => {
    const { bank_name, card_name } = req.body;
    if (!bank_name) return res.status(400).json({ error: 'bank_name required' });
    try {
      const result = await db.execute(
        `INSERT INTO user_cards (user_id, bank_name, card_name)
         VALUES (:userId, :bank_name, :card_name) RETURNING id INTO :id`,
        {
          userId: req.user.id,
          bank_name,
          card_name: card_name || null,
          id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER },
        }
      );
      res.status(201).json({ id: result.outBinds.id[0], bank_name, card_name: card_name || null });
    } catch { res.status(500).json({ error: 'server error' }); }
  });

  // DELETE /cards/:id — remove card (cascades rules)
  router.delete('/:id', async (req, res) => {
    try {
      const result = await db.execute(
        `DELETE FROM user_cards WHERE id = :id AND user_id = :userId`,
        { id: Number(req.params.id), userId: req.user.id }
      );
      if (result.rowsAffected === 0) return res.status(404).json({ error: 'not found' });
      res.json({ ok: true });
    } catch { res.status(500).json({ error: 'server error' }); }
  });

  // GET /cards/best?month=YYYY-MM — best cashback per MCC across all user cards
  router.get('/best', async (req, res) => {
    const { month } = req.query;
    if (!month || !VALID_MONTH.test(month)) return res.status(400).json({ error: 'invalid month' });
    try {
      const result = await db.execute(
        `SELECT r.mcc_code, r.cashback_pct, c.bank_name
         FROM card_cashback_rules r
         JOIN user_cards c ON c.id = r.card_id
         WHERE c.user_id = :userId AND r.rule_month = :month`,
        { userId: req.user.id, month }
      );
      const best = {};
      for (const row of result.rows) {
        const cur = best[row.MCC_CODE];
        if (!cur || row.CASHBACK_PCT > cur.pct) {
          best[row.MCC_CODE] = { pct: row.CASHBACK_PCT, bank: row.BANK_NAME };
        }
      }
      res.json(best);
    } catch { res.status(500).json({ error: 'server error' }); }
  });

  // GET /cards/:id/rules?month=YYYY-MM
  router.get('/:id/rules', async (req, res) => {
    const { month } = req.query;
    if (!month || !VALID_MONTH.test(month)) return res.status(400).json({ error: 'invalid month' });
    try {
      const card = await db.execute(
        `SELECT id FROM user_cards WHERE id = :id AND user_id = :userId`,
        { id: Number(req.params.id), userId: req.user.id }
      );
      if (!card.rows.length) return res.status(404).json({ error: 'not found' });
      const rules = await db.execute(
        `SELECT id, mcc_code, cashback_pct FROM card_cashback_rules
         WHERE card_id = :cardId AND rule_month = :month ORDER BY mcc_code`,
        { cardId: Number(req.params.id), month }
      );
      res.json(rules.rows.map(r => ({ id: r.ID, mcc_code: r.MCC_CODE, cashback_pct: r.CASHBACK_PCT })));
    } catch { res.status(500).json({ error: 'server error' }); }
  });

  // PUT /cards/:id/rules — replace all rules for a month
  router.put('/:id/rules', async (req, res) => {
    const { month, rules } = req.body;
    if (!month || !VALID_MONTH.test(month)) return res.status(400).json({ error: 'invalid month' });
    if (!Array.isArray(rules)) return res.status(400).json({ error: 'rules must be array' });
    for (const r of rules) {
      if (!r.mcc_code || !/^\d{4}$/.test(r.mcc_code))
        return res.status(400).json({ error: 'invalid mcc_code' });
      if (!validPct(r.cashback_pct))
        return res.status(400).json({ error: 'cashback_pct must be 0 < n <= 100' });
    }
    try {
      const card = await db.execute(
        `SELECT id FROM user_cards WHERE id = :id AND user_id = :userId`,
        { id: Number(req.params.id), userId: req.user.id }
      );
      if (!card.rows.length) return res.status(404).json({ error: 'not found' });
      const cardId = Number(req.params.id);
      await db.execute(
        `DELETE FROM card_cashback_rules WHERE card_id = :cardId AND rule_month = :month`,
        { cardId, month }
      );
      for (const r of rules) {
        await db.execute(
          `INSERT INTO card_cashback_rules (card_id, rule_month, mcc_code, cashback_pct)
           VALUES (:cardId, :month, :mcc_code, :cashback_pct)`,
          { cardId, month, mcc_code: r.mcc_code, cashback_pct: r.cashback_pct }
        );
      }
      res.json({ ok: true });
    } catch { res.status(500).json({ error: 'server error' }); }
  });

  return router;
};
