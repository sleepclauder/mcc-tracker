'use strict';

function topMcc(votes, days = 30) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = votes.filter(v => new Date(v.VOTED_AT).getTime() >= cutoff);
  if (!recent.length) return null;

  const counts = {};
  for (const v of recent) counts[v.MCC_CODE] = (counts[v.MCC_CODE] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function lastMcc(votes) {
  if (!votes.length) return null;
  return [...votes].sort((a, b) => new Date(b.VOTED_AT) - new Date(a.VOTED_AT))[0].MCC_CODE;
}

module.exports = { topMcc, lastMcc };
