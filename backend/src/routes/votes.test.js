'use strict';
process.env.JWT_SECRET = 'test-secret';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const TOKEN = jwt.sign({ id: 1, email: 'a@b.com' }, 'test-secret', { expiresIn: '1h' });

function makeApp(mockDb) {
  const app = express();
  app.use(express.json());
  app.use('/votes', require('./votes')(mockDb));
  return app;
}

function mockDb(mccExists = true) {
  return {
    execute: async (sql) => {
      if (sql.includes('mcc_codes'))    return { rows: mccExists ? [{ MCC_CODE: '5411' }] : [] };
      if (sql.includes('MERGE'))        return { rowsAffected: 1 };
      if (sql.includes('SELECT id FROM merchants')) return { rows: [{ ID: 99 }] };
      if (sql.includes('INSERT INTO mcc_votes'))    return { rowsAffected: 1 };
      return { rows: [] };
    },
  };
}

test('POST /votes - success', async () => {
  const res = await request(makeApp(mockDb()))
    .post('/votes')
    .set('Authorization', `Bearer ${TOKEN}`)
    .send({ yandex_firm_id: 'firm1', name: 'Пятёрочка', address: 'ул. 1', lat: 55.75, lon: 37.61, mcc_code: '5411' });
  assert.equal(res.status, 201);
  assert.equal(res.body.ok, true);
});

test('POST /votes - no auth returns 401', async () => {
  const res = await request(makeApp(mockDb()))
    .post('/votes')
    .send({ yandex_firm_id: 'firm1', mcc_code: '5411' });
  assert.equal(res.status, 401);
});

test('POST /votes - missing yandex_firm_id returns 400', async () => {
  const res = await request(makeApp(mockDb()))
    .post('/votes')
    .set('Authorization', `Bearer ${TOKEN}`)
    .send({ mcc_code: '5411' });
  assert.equal(res.status, 400);
});

test('POST /votes - invalid mcc_code format returns 400', async () => {
  const res = await request(makeApp(mockDb()))
    .post('/votes')
    .set('Authorization', `Bearer ${TOKEN}`)
    .send({ yandex_firm_id: 'firm1', mcc_code: 'ABCD' });
  assert.equal(res.status, 400);
});

test('POST /votes - unknown mcc_code returns 400', async () => {
  const res = await request(makeApp(mockDb(false)))
    .post('/votes')
    .set('Authorization', `Bearer ${TOKEN}`)
    .send({ yandex_firm_id: 'firm1', mcc_code: '9999' });
  assert.equal(res.status, 400);
});

test('POST /votes - with purchase_date', async () => {
  const res = await request(makeApp(mockDb()))
    .post('/votes')
    .set('Authorization', `Bearer ${TOKEN}`)
    .send({ yandex_firm_id: 'firm1', mcc_code: '5411', purchase_date: '2026-05-10' });
  assert.equal(res.status, 201);
});
