'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { topMcc, lastMcc } = require('./mccService');

const now = new Date();
const ago = (days) => new Date(now - days * 86400000).toISOString();

test('topMcc returns most frequent recent code', () => {
  const votes = [
    { MCC_CODE: '5411', VOTED_AT: ago(1) },
    { MCC_CODE: '5411', VOTED_AT: ago(2) },
    { MCC_CODE: '5999', VOTED_AT: ago(3) },
  ];
  assert.equal(topMcc(votes), '5411');
});

test('topMcc ignores votes older than 30 days', () => {
  const votes = [
    { MCC_CODE: '5411', VOTED_AT: ago(31) },
    { MCC_CODE: '5411', VOTED_AT: ago(32) },
    { MCC_CODE: '5999', VOTED_AT: ago(1) },
  ];
  assert.equal(topMcc(votes), '5999');
});

test('topMcc returns null for empty array', () => {
  assert.equal(topMcc([]), null);
});

test('topMcc returns null when all votes are older than window', () => {
  const votes = [{ MCC_CODE: '5411', VOTED_AT: ago(31) }];
  assert.equal(topMcc(votes), null);
});

test('lastMcc returns most recent code', () => {
  const votes = [
    { MCC_CODE: '5411', VOTED_AT: ago(5) },
    { MCC_CODE: '5999', VOTED_AT: ago(1) },
    { MCC_CODE: '5812', VOTED_AT: ago(10) },
  ];
  assert.equal(lastMcc(votes), '5999');
});

test('lastMcc returns null for empty array', () => {
  assert.equal(lastMcc([]), null);
});

test('lastMcc does not mutate original array', () => {
  const votes = [
    { MCC_CODE: '5411', VOTED_AT: ago(1) },
    { MCC_CODE: '5999', VOTED_AT: ago(5) },
  ];
  const original = [...votes];
  lastMcc(votes);
  assert.deepEqual(votes, original);
});
