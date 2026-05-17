'use strict';
const express = require('express');

const GIS_STALE_DAYS = 30;

async function fetch2GIS(name, lat, lon) {
  const key = process.env.GIS_KEY;
  if (!key || lat == null || lon == null) return null;
  try {
    const params = new URLSearchParams({
      q: name || '',
      point: `${lon},${lat}`,
      radius: '100',
      type: 'branch',
      fields: 'items.reviews,items.rating_steps',
      key,
    });
    const res = await fetch(
      `https://catalog.api.2gis.com/3.0/items?${params}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.result?.items?.[0];
    if (!item) return null;
    return {
      gis_url: item.url || null,
      gis_rating: item.rating_steps?.point ?? item.reviews?.general_rating ?? null,
      gis_review_count: item.reviews?.count ?? 0,
    };
  } catch {
    return null;
  }
}

module.exports = function makeStatsRouter(db) {
  const router = express.Router();

  router.get('/:yandex_firm_id/stats', async (req, res) => {
    const { yandex_firm_id } = req.params;
    try {
      const result = await db.execute(
        `SELECT s.yandex_firm_id, s.name, s.address, s.lat, s.lon,
                s.last_mcc, s.top_mcc_30d, s.votes_total, s.votes_30d,
                s.gis_url, s.gis_rating, s.gis_review_count, s.gis_fetched_at
         FROM v_merchant_stats s
         WHERE s.yandex_firm_id = :yandex_firm_id`,
        { yandex_firm_id }
      );
      if (!result.rows.length) return res.status(404).json({ error: 'merchant not found' });
      let stats = result.rows[0];

      const staleMs = GIS_STALE_DAYS * 24 * 60 * 60 * 1000;
      const isStale = !stats.GIS_FETCHED_AT ||
        (Date.now() - new Date(stats.GIS_FETCHED_AT).getTime() > staleMs);

      if (isStale) {
        const gis = await fetch2GIS(stats.NAME, stats.LAT, stats.LON);
        if (gis) {
          try {
            await db.execute(
              `UPDATE merchants SET gis_url=:gis_url, gis_rating=:gis_rating,
               gis_review_count=:gis_review_count, gis_fetched_at=SYSTIMESTAMP
               WHERE yandex_firm_id=:yandex_firm_id`,
              { ...gis, yandex_firm_id }
            );
          } catch { /* non-fatal — serve fresh data anyway */ }
          stats = {
            ...stats,
            GIS_URL: gis.gis_url,
            GIS_RATING: gis.gis_rating,
            GIS_REVIEW_COUNT: gis.gis_review_count,
          };
        }
      }

      res.json(stats);
    } catch (e) {
      res.status(500).json({ error: 'server error' });
    }
  });

  return router;
};
