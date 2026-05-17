'use strict';
process.env.JWT_SECRET = 'test-secret';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

function makeApp(mockDb) {
  const app = express();
  app.use(express.json());
  app.use('/auth', require('./auth')(mockDb));
  return app;
}

function mockDbWithUser(user = null) {
  return {
    execute: async (sql) => {
      if (sql.includes('SELECT id FROM users')) return { rows: user ? [user] : [] };
      if (sql.includes('INSERT INTO users')) return { outBinds: { id: [42] } };
      if (sql.includes('SELECT id, email, password_hash')) return { rows: user ? [user] : [] };
      return { rows: [] };
    },
  };
}

test('POST /auth/register - success', async () => {
  const app = makeApp(mockDbWithUser());
  const res = await request(app).post('/auth/register').send({ email: 'new@test.com', password: 'password123' });
  assert.equal(res.status, 201);
  assert.ok(res.body.token);
});

test('POST /auth/register - missing fields returns 400', async () => {
  const app = makeApp(mockDbWithUser());
  const res = await request(app).post('/auth/register').send({ email: 'new@test.com' });
  assert.equal(res.status, 400);
});

test('POST /auth/register - invalid email returns 400', async () => {
  const app = makeApp(mockDbWithUser());
  const res = await request(app).post('/auth/register').send({ email: 'notanemail', password: 'password123' });
  assert.equal(res.status, 400);
});

test('POST /auth/register - short password returns 400', async () => {
  const app = makeApp(mockDbWithUser());
  const res = await request(app).post('/auth/register').send({ email: 'a@b.com', password: '1234' });
  assert.equal(res.status, 400);
});

test('POST /auth/register - duplicate email returns 409', async () => {
  const app = makeApp(mockDbWithUser({ ID: 1 }));
  const res = await request(app).post('/auth/register').send({ email: 'exists@test.com', password: 'password123' });
  assert.equal(res.status, 409);
});

test('POST /auth/login - wrong password returns 401', async () => {
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('correctpassword', 10);
  const app = makeApp(mockDbWithUser({ ID: 1, EMAIL: 'a@b.com', PASSWORD_HASH: hash }));
  const res = await request(app).post('/auth/login').send({ email: 'a@b.com', password: 'wrongpassword' });
  assert.equal(res.status, 401);
});

test('POST /auth/login - unknown user returns 401', async () => {
  const app = makeApp(mockDbWithUser());
  const res = await request(app).post('/auth/login').send({ email: 'nobody@test.com', password: 'pass1234' });
  assert.equal(res.status, 401);
});

test('POST /auth/login - success returns token', async () => {
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('mypassword', 10);
  const app = makeApp(mockDbWithUser({ ID: 5, EMAIL: 'a@b.com', PASSWORD_HASH: hash }));
  const res = await request(app).post('/auth/login').send({ email: 'a@b.com', password: 'mypassword' });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
});

test('POST /auth/login - missing fields returns 400', async () => {
  const app = makeApp(mockDbWithUser());
  const res = await request(app).post('/auth/login').send({ email: 'a@b.com' });
  assert.equal(res.status, 400);
});
