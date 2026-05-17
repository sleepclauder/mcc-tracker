'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const MOCK_STAT = {
  YANDEX_FIRM_ID: 'firm1', NAME: 'Пятёрочка', ADDRESS: 'ул. Ленина 1',
  LAT: 55.75, LON: 37.61, LAST_MCC: '5411', TOP_MCC_30D: '5411', VOTES_TOTAL: 10, VOTES_30D: 3,
};

function makeApp(rows) {
  const app = express();
  const mockDb = { execute: async () => ({ rows }) };
  app.use('/merchants', require('./stats')(mockDb));
  return app;
}

test('GET /merchants/:id/stats - returns stats for existing merchant', async () => {
  const res = await request(makeApp([MOCK_STAT])).get('/merchants/firm1/stats');
  assert.equal(res.status, 200);
  assert.equal(res.body.LAST_MCC, '5411');
  assert.equal(res.body.VOTES_TOTAL, 10);
});

test('GET /merchants/:id/stats - 404 for unknown merchant', async () => {
  const res = await request(makeApp([])).get('/merchants/unknown/stats');
  assert.equal(res.status, 404);
});

test('GET /merchants/:id/stats - merchant with no votes', async () => {
  const row = { ...MOCK_STAT, LAST_MCC: null, TOP_MCC_30D: null, VOTES_TOTAL: 0, VOTES_30D: 0 };
  const res = await request(makeApp([row])).get('/merchants/firm1/stats');
  assert.equal(res.status, 200);
  assert.equal(res.body.VOTES_TOTAL, 0);
  assert.equal(res.body.LAST_MCC, null);
});
