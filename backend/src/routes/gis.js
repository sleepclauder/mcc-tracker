'use strict';
const express = require('express');

module.exports = function makeGisRouter() {
  const router = express.Router();

  router.get('/nearby', async (req, res) => {
    const key = process.env.GIS_KEY;
    if (!key) return res.json([]);

    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const radius = req.query.radius_m ? Math.min(parseInt(req.query.radius_m), 2000) : 1000;

    if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'lat and lon required' });

    try {
      // rubric_id list keeps only commercial POI matching our MCC categories:
      // 164=supermarkets, 179=pharmacies, 101=restaurants/cafes, 1491=fuel, 225=malls
      const RUBRIC_IDS = '164,179,101,1491,225';
      const RUBRIC_TO_MCC = { '164': '5411', '179': '5912', '101': '5812', '1491': '5541', '225': '5311' };
      const params = new URLSearchParams({
        radius: String(radius),
        type: 'branch',
        rubric_id: RUBRIC_IDS,
        fields: 'items.point,items.address_name,items.rubrics',
        page_size: '10',
        key,
      });
      // point must use literal comma — URLSearchParams encodes it as %2C which 2GIS rejects
      const url = `https://catalog.api.2gis.com/3.0/items?point=${lon},${lat}&${params}`;
      const r = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) return res.json([]);
      const data = await r.json();
      if (data.meta?.code !== 200) return res.json([]);
      const items = data.result?.items ?? [];
      res.json(
        items
          .filter(i => i.point)
          .map(i => {
            const rubricId = i.rubrics?.[0]?.id ? String(i.rubrics[0].id) : null;
            return {
              YANDEX_FIRM_ID: i.id,
              NAME: i.name,
              ADDRESS: i.address_name || '',
              LAT: i.point.lat,
              LON: i.point.lon,
              LAST_MCC: RUBRIC_TO_MCC[rubricId] || null,
            };
          })
      );
    } catch {
      res.json([]);
    }
  });

  return router;
};
