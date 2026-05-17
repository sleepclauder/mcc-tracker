'use strict';
const express = require('express');

const LAT_PER_METER = 1 / 111000;

function boundingBox(lat, lon, radiusM) {
  const dlat = radiusM * LAT_PER_METER;
  const dlon = dlat / Math.cos((lat * Math.PI) / 180);
  return { lat_min: lat - dlat, lat_max: lat + dlat, lon_min: lon - dlon, lon_max: lon + dlon };
}

module.exports = function makeMerchantsRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const radius = req.query.radius_m !== undefined ? parseInt(req.query.radius_m) : 1000;

    if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'lat and lon required' });
    if (radius < 1 || radius > 50000) return res.status(400).json({ error: 'radius_m must be 1–50000' });

    const bb = boundingBox(lat, lon, radius);
    try {
      const result = await db.execute(
        `SELECT s.yandex_firm_id, s.name, s.address, s.lat, s.lon,
                s.last_mcc, s.top_mcc_30d, s.votes_total, s.votes_30d,
                s.gis_rating, s.gis_review_count
         FROM v_merchant_stats s
         WHERE s.lat BETWEEN :lat_min AND :lat_max
           AND s.lon BETWEEN :lon_min AND :lon_max`,
        bb
      );
      res.json(result.rows);
    } catch (e) {
      res.status(500).json({ error: 'server error' });
    }
  });

  return router;
};
