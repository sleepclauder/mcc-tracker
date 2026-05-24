'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';

function makeToken(id = 1) {
  return jwt.sign({ id, email: 'u@test.com' }, process.env.JWT_SECRET);
}

function makeApp(db) {
  const app = express();
  app.use(express.json());
  app.use('/merchants', require('./no_terminal')(db));
  return app;
}

test('POST /merchants/:id/no-terminal - requires auth', async () => {
  const db = { execute: async () => ({ rows: [] }) };
  const res = await request(makeApp(db)).post('/merchants/firm1/no-terminal');
  assert.equal(res.status, 401);
});

test('POST /merchants/:id/no-terminal - inserts report when none exists', async () => {
  let insertCalled = false;
  const db = {
    execute: async (sql) => {
      if (sql.includes('SELECT id FROM no_terminal')) return { rows: [] };
      if (sql.includes('INSERT INTO no_terminal')) { insertCalled = true; return { rows: [] }; }
      if (sql.includes('COUNT(*)')) return { rows: [{ CNT: 1 }] };
      return { rows: [] };
    },
  };
  const res = await request(makeApp(db))
    .post('/merchants/firm1/no-terminal')
    .set('Authorization', `Bearer ${makeToken()}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.reported, true);
  assert.equal(res.body.count, 1);
  assert.ok(insertCalled);
});

test('POST /merchants/:id/no-terminal - deletes report when already exists', async () => {
  let deleteCalled = false;
  const db = {
    execute: async (sql) => {
      if (sql.includes('SELECT id FROM no_terminal')) return { rows: [{ ID: 42 }] };
      if (sql.includes('DELETE FROM no_terminal')) { deleteCalled = true; return { rows: [] }; }
      if (sql.includes('COUNT(*)')) return { rows: [{ CNT: 0 }] };
      return { rows: [] };
    },
  };
  const res = await request(makeApp(db))
    .post('/merchants/firm1/no-terminal')
    .set('Authorization', `Bearer ${makeToken()}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.reported, false);
  assert.equal(res.body.count, 0);
  assert.ok(deleteCalled);
});

test('POST /merchants/:id/no-terminal - 500 on db error', async () => {
  const db = { execute: async () => { throw new Error('db fail'); } };
  const res = await request(makeApp(db))
    .post('/merchants/firm1/no-terminal')
    .set('Authorization', `Bearer ${makeToken()}`);
  assert.equal(res.status, 500);
});
