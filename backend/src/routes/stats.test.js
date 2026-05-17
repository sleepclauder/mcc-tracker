'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const MOCK_STAT = {
  YANDEX_FIRM_ID: 'firm1', NAME: 'Пятёрочка', ADDRESS: 'ул. Ленина 1',
  LAT: 55.75, LON: 37.61, LAST_MCC: '5411', TOP_MCC_30D: '5411', VOTES_TOTAL: 10, VOTES_30D: 3,
  GIS_URL: null, GIS_RATING: null, GIS_REVIEW_COUNT: 0, GIS_FETCHED_AT: null,
};

const MOCK_STAT_WITH_GIS = {
  ...MOCK_STAT,
  GIS_URL: 'https://2gis.ru/spb/firm/70000001020788064',
  GIS_RATING: 4.5,
  GIS_REVIEW_COUNT: 123,
  GIS_FETCHED_AT: new Date(),
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

test('GET /merchants/:id/stats - returns gis rating and url when cached', async () => {
  const res = await request(makeApp([MOCK_STAT_WITH_GIS])).get('/merchants/firm1/stats');
  assert.equal(res.status, 200);
  assert.equal(res.body.GIS_RATING, 4.5);
  assert.equal(res.body.GIS_REVIEW_COUNT, 123);
  assert.ok(res.body.GIS_URL.includes('2gis.ru'));
});

test('GET /merchants/:id/stats - responds without gis data when GIS_KEY not set', async () => {
  // GIS_KEY not set in test env → fetch2GIS returns null → no gis enrichment
  const res = await request(makeApp([MOCK_STAT])).get('/merchants/firm1/stats');
  assert.equal(res.status, 200);
  assert.equal(res.body.GIS_RATING, null);
});
