'use strict';
const express = require('express');

module.exports = function makeGisRouter() {
  const router = express.Router();

  router.get('/nearby', async (req, res) => {
    const key = process.env.GIS_KEY;
    if (!key) return res.json([]);

    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const radius = req.query.radius_m ? Math.min(parseInt(req.query.radius_m), 5000) : 1000;

    if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'lat and lon required' });

    try {
      const params = new URLSearchParams({
        point: `${lon},${lat}`,
        radius: String(radius),
        type: 'branch',
        fields: 'items.point,items.address_name',
        page_size: '50',
        key,
      });
      const r = await fetch(`https://catalog.api.2gis.com/3.0/items?${params}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) return res.json([]);
      const data = await r.json();
      const items = data.result?.items ?? [];
      res.json(
        items
          .filter(i => i.point)
          .map(i => ({
            YANDEX_FIRM_ID: i.id,
            NAME: i.name,
            ADDRESS: i.address_name || '',
            LAT: i.point.lat,
            LON: i.point.lon,
          }))
      );
    } catch {
      res.json([]);
    }
  });

  return router;
};
