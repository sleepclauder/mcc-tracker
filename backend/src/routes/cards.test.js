'use strict';
process.env.JWT_SECRET = 'test-secret';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const TOKEN = jwt.sign({ id: 7, email: 'user@test.com' }, 'test-secret', { expiresIn: '1h' });
const OTHER_TOKEN = jwt.sign({ id: 99, email: 'other@test.com' }, 'test-secret', { expiresIn: '1h' });

function makeApp(db) {
  const app = express();
  app.use(express.json());
  app.use('/cards', require('./cards')(db));
  return app;
}

const CARD_ROW = { ID: 1, BANK_NAME: 'Т-Банк', CARD_NAME: 'Черная' };
const RULE_ROW = { ID: 10, CATEGORY_NAME: 'Супермаркеты', CASHBACK_PCT: 10 };

function mockDb(overrides = {}) {
  return {
    execute: async (sql) => {
      if (sql.includes('SELECT id, bank_name')) return { rows: overrides.cards ?? [CARD_ROW] };
      if (sql.includes('INSERT INTO user_cards'))
        return { outBinds: { id: [1] } };
      if (sql.includes('DELETE FROM user_cards'))
        return { rowsAffected: overrides.deleteCard ?? 1 };
      if (sql.includes('card_cashback_rules') && sql.includes('JOIN user_cards'))
        return { rows: overrides.bestRules ?? [{ CATEGORY_NAME: 'Супермаркеты', CASHBACK_PCT: 10, BANK_NAME: 'Т-Банк' }] };
      if (sql.includes('SELECT id FROM user_cards'))
        return { rows: overrides.cardOwner ?? [{ ID: 1 }] };
      if (sql.includes('SELECT id, category_name'))
        return { rows: overrides.rules ?? [RULE_ROW] };
      if (sql.includes('DELETE FROM card_cashback_rules'))
        return { rowsAffected: 1 };
      if (sql.includes('INSERT INTO card_cashback_rules'))
        return { rowsAffected: 1 };
      return { rows: [], rowsAffected: 0 };
    },
  };
}

// GET /cards
test('GET /cards returns list', async () => {
  const res = await request(makeApp(mockDb()))
    .get('/cards')
    .set('Authorization', `Bearer ${TOKEN}`);
  assert.equal(res.status, 200);
  assert.equal(res.body[0].bank_name, 'Т-Банк');
});

test('GET /cards without auth returns 401', async () => {
  const res = await request(makeApp(mockDb())).get('/cards');
  assert.equal(res.status, 401);
});

// POST /cards
test('POST /cards creates card', async () => {
  const res = await request(makeApp(mockDb()))
    .post('/cards')
    .set('Authorization', `Bearer ${TOKEN}`)
    .send({ bank_name: 'Сбер', card_name: 'Прайм' });
  assert.equal(res.status, 201);
  assert.equal(res.body.bank_name, 'Сбер');
});

test('POST /cards missing bank_name returns 400', async () => {
  const res = await request(makeApp(mockDb()))
    .post('/cards')
    .set('Authorization', `Bearer ${TOKEN}`)
    .send({ card_name: 'Прайм' });
  assert.equal(res.status, 400);
});

// DELETE /cards/:id
test('DELETE /cards/:id removes card', async () => {
  const res = await request(makeApp(mockDb()))
    .delete('/cards/1')
    .set('Authorization', `Bearer ${TOKEN}`);
  assert.equal(res.status, 200);
  assert.ok(res.body.ok);
});

test('DELETE /cards/:id not found returns 404', async () => {
  const res = await request(makeApp(mockDb({ deleteCard: 0 })))
    .delete('/cards/99')
    .set('Authorization', `Bearer ${TOKEN}`);
  assert.equal(res.status, 404);
});

// GET /cards/best
test('GET /cards/best returns rules array', async () => {
  const res = await request(makeApp(mockDb()))
    .get('/cards/best?month=2026-05')
    .set('Authorization', `Bearer ${TOKEN}`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body[0].category_name, 'Супермаркеты');
  assert.equal(res.body[0].cashback_pct, 10);
  assert.equal(res.body[0].bank_name, 'Т-Банк');
});

test('GET /cards/best returns all rules (frontend aggregates)', async () => {
  const db = mockDb({ bestRules: [
    { CATEGORY_NAME: 'Рестораны', CASHBACK_PCT: 5, BANK_NAME: 'Сбер' },
    { CATEGORY_NAME: 'Рестораны', CASHBACK_PCT: 10, BANK_NAME: 'Т-Банк' },
  ] });
  const res = await request(makeApp(db))
    .get('/cards/best?month=2026-05')
    .set('Authorization', `Bearer ${TOKEN}`);
  assert.equal(res.body.length, 2);
});

test('GET /cards/best invalid month returns 400', async () => {
  const res = await request(makeApp(mockDb()))
    .get('/cards/best?month=bad')
    .set('Authorization', `Bearer ${TOKEN}`);
  assert.equal(res.status, 400);
});

// GET /cards/:id/rules
test('GET /cards/:id/rules returns rules', async () => {
  const res = await request(makeApp(mockDb()))
    .get('/cards/1/rules?month=2026-05')
    .set('Authorization', `Bearer ${TOKEN}`);
  assert.equal(res.status, 200);
  assert.equal(res.body[0].category_name, 'Супермаркеты');
  assert.equal(res.body[0].cashback_pct, 10);
});

test('GET /cards/:id/rules wrong owner returns 404', async () => {
  const res = await request(makeApp(mockDb({ cardOwner: [] })))
    .get('/cards/1/rules?month=2026-05')
    .set('Authorization', `Bearer ${OTHER_TOKEN}`);
  assert.equal(res.status, 404);
});

test('GET /cards/:id/rules invalid month returns 400', async () => {
  const res = await request(makeApp(mockDb()))
    .get('/cards/1/rules?month=2026-13')
    .set('Authorization', `Bearer ${TOKEN}`);
  assert.equal(res.status, 400);
});

// PUT /cards/:id/rules
test('PUT /cards/:id/rules saves rules', async () => {
  const res = await request(makeApp(mockDb()))
    .put('/cards/1/rules')
    .set('Authorization', `Bearer ${TOKEN}`)
    .send({ month: '2026-05', rules: [{ category_name: 'Супермаркеты', cashback_pct: 10 }] });
  assert.equal(res.status, 200);
  assert.ok(res.body.ok);
});

test('PUT /cards/:id/rules invalid pct returns 400', async () => {
  const res = await request(makeApp(mockDb()))
    .put('/cards/1/rules')
    .set('Authorization', `Bearer ${TOKEN}`)
    .send({ month: '2026-05', rules: [{ category_name: 'Супермаркеты', cashback_pct: 150 }] });
  assert.equal(res.status, 400);
});

test('PUT /cards/:id/rules empty category_name returns 400', async () => {
  const res = await request(makeApp(mockDb()))
    .put('/cards/1/rules')
    .set('Authorization', `Bearer ${TOKEN}`)
    .send({ month: '2026-05', rules: [{ category_name: '', cashback_pct: 10 }] });
  assert.equal(res.status, 400);
});

test('PUT /cards/:id/rules missing category_name returns 400', async () => {
  const res = await request(makeApp(mockDb()))
    .put('/cards/1/rules')
    .set('Authorization', `Bearer ${TOKEN}`)
    .send({ month: '2026-05', rules: [{ cashback_pct: 10 }] });
  assert.equal(res.status, 400);
});

test('PUT /cards/:id/rules empty rules clears month', async () => {
  const res = await request(makeApp(mockDb()))
    .put('/cards/1/rules')
    .set('Authorization', `Bearer ${TOKEN}`)
    .send({ month: '2026-05', rules: [] });
  assert.equal(res.status, 200);
});
