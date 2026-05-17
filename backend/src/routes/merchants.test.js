'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const MOCK_ROWS = [
  { YANDEX_FIRM_ID: 'firm1', NAME: 'Пятёрочка', ADDRESS: 'ул. Ленина 1', LAT: 55.75, LON: 37.61, LAST_MCC: '5411', TOP_MCC_30D: '5411', VOTES_TOTAL: 10, VOTES_30D: 3 },
];

function makeApp(rows = MOCK_ROWS) {
  const app = express();
  app.use(express.json());
  const mockDb = { execute: async () => ({ rows }) };
  app.use('/merchants', require('./merchants')(mockDb));
  return app;
}

test('GET /merchants - success with coordinates', async () => {
  const res = await request(makeApp()).get('/merchants?lat=55.75&lon=37.61&radius_m=500');
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].YANDEX_FIRM_ID, 'firm1');
});

test('GET /merchants - returns empty array when no merchants nearby', async () => {
  const res = await request(makeApp([])).get('/merchants?lat=55.75&lon=37.61');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);
});

test('GET /merchants - missing lat returns 400', async () => {
  const res = await request(makeApp()).get('/merchants?lon=37.61');
  assert.equal(res.status, 400);
});

test('GET /merchants - missing lon returns 400', async () => {
  const res = await request(makeApp()).get('/merchants?lat=55.75');
  assert.equal(res.status, 400);
});

test('GET /merchants - radius too large returns 400', async () => {
  const res = await request(makeApp()).get('/merchants?lat=55.75&lon=37.61&radius_m=99999');
  assert.equal(res.status, 400);
});

test('GET /merchants - radius zero returns 400', async () => {
  const res = await request(makeApp()).get('/merchants?lat=55.75&lon=37.61&radius_m=0');
  assert.equal(res.status, 400);
});

test('GET /merchants - uses default radius when not specified', async () => {
  const res = await request(makeApp()).get('/merchants?lat=55.75&lon=37.61');
  assert.equal(res.status, 200);
});
