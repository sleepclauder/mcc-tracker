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
      // 164=supermarkets, 179=pharmacies, 101=restaurants/cafes, 18547=fuel, 225=malls
      // 9041=auto service, 7689=tire service, 341=insurance
      const RUBRIC_IDS = '164,179,101,18547,225,9041,7689,341';
      const RUBRIC_TO_MCC = {
        '164': '5411', '179': '5912', '101': '5812', '18547': '5541', '225': '5311',
        '9041': '7538', '7689': '7534', '341': '6411',
      };
      const baseParams = new URLSearchParams({
        radius: String(radius),
        type: 'branch',
        rubric_id: RUBRIC_IDS,
        fields: 'items.point,items.address_name,items.rubrics',
        page_size: '10',
        key,
      });
      // point must use literal comma — URLSearchParams encodes it as %2C which 2GIS rejects
      const fetchPage = page => fetch(
        `https://catalog.api.2gis.com/3.0/items?point=${lon},${lat}&${baseParams}&page=${page}`,
        { signal: AbortSignal.timeout(5000) }
      ).then(r => r.ok ? r.json() : null).then(d => d?.meta?.code === 200 ? d.result?.items ?? [] : []);

      // fetch 2 pages in parallel to get up to 20 results
      const [page1, page2] = await Promise.all([fetchPage(1), fetchPage(2)]);
      const seen = new Set();
      const items = [...page1, ...page2].filter(i => {
        if (!i.point || seen.has(i.id)) return false;
        seen.add(i.id);
        return true;
      });

      res.json(
        items.map(i => {
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
