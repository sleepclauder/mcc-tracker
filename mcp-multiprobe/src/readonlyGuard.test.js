import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertReadOnlyQuery } from './readonlyGuard.js';

test('accepts a plain SELECT', () => {
  assert.equal(assertReadOnlyQuery('SELECT * FROM probes'), 'SELECT * FROM probes');
});

test('accepts SELECT with trailing semicolon', () => {
  assert.equal(assertReadOnlyQuery('SELECT id FROM probes;'), 'SELECT id FROM probes');
});

test('accepts a WITH (CTE) query', () => {
  const q = 'WITH x AS (SELECT 1 AS a) SELECT a FROM x';
  assert.equal(assertReadOnlyQuery(q), q);
});

test('rejects empty query', () => {
  assert.throws(() => assertReadOnlyQuery('   '), /must not be empty/);
});

test('rejects INSERT', () => {
  assert.throws(() => assertReadOnlyQuery('INSERT INTO probes VALUES (1)'), /Only SELECT statements/);
});

test('rejects stacked statements', () => {
  assert.throws(
    () => assertReadOnlyQuery('SELECT 1; DROP TABLE probes;'),
    /Multiple statements/
  );
});

test('rejects EXEC hidden inside a SELECT', () => {
  assert.throws(
    () => assertReadOnlyQuery("SELECT 1; EXEC sp_who"),
    /Multiple statements/
  );
});

test('rejects stored-procedure style prefix', () => {
  assert.throws(() => assertReadOnlyQuery('sp_helpdb'), /Only SELECT statements/);
});
