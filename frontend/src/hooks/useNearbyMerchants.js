import { useState, useEffect } from 'react';
import client from '../api/client';

export function useNearbyMerchants(lat, lon, radiusM = 1000) {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (lat == null || lon == null) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [dbRes, gisRes] = await Promise.allSettled([
          client.get('/merchants', { params: { lat, lon, radius_m: radiusM } }),
          client.get('/gis/nearby', { params: { lat, lon, radius_m: radiusM } }),
        ]);
        if (cancelled) return;

        const dbRows = dbRes.status === 'fulfilled' ? dbRes.value.data : [];
        const gisRows = gisRes.status === 'fulfilled' ? gisRes.value.data : [];

        const dbIds = new Set(dbRows.map(r => r.YANDEX_FIRM_ID));
        const merged = [...dbRows, ...gisRows.filter(r => !dbIds.has(r.YANDEX_FIRM_ID))];

        setMerchants(merged);
        if (dbRes.status === 'rejected') setError(dbRes.reason?.response?.data?.error || 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [lat, lon, radiusM]);

  return { merchants, loading, error };
}
