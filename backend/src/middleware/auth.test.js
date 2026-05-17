'use strict';
process.env.JWT_SECRET = 'test-secret';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const requireAuth = require('./auth');

function makeApp() {
  const app = express();
  app.get('/protected', requireAuth, (req, res) => res.json({ userId: req.user.id }));
  return app;
}

test('valid token passes through', async () => {
  const token = jwt.sign({ id: 1, email: 'a@b.com' }, 'test-secret', { expiresIn: '1h' });
  const res = await request(makeApp()).get('/protected').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.userId, 1);
});

test('missing Authorization header returns 401', async () => {
  const res = await request(makeApp()).get('/protected');
  assert.equal(res.status, 401);
});

test('malformed header returns 401', async () => {
  const res = await request(makeApp()).get('/protected').set('Authorization', 'Basic abc');
  assert.equal(res.status, 401);
});

test('expired token returns 401', async () => {
  const token = jwt.sign({ id: 1 }, 'test-secret', { expiresIn: -1 });
  const res = await request(makeApp()).get('/protected').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 401);
});

test('token with wrong secret returns 401', async () => {
  const token = jwt.sign({ id: 1 }, 'wrong-secret');
  const res = await request(makeApp()).get('/protected').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 401);
});

test('garbage token returns 401', async () => {
  const res = await request(makeApp()).get('/protected').set('Authorization', 'Bearer notavalidtoken');
  assert.equal(res.status, 401);
});
