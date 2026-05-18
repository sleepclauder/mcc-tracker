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
        const params = { lat, lon, radius_m: radiusM };
        const [dbRes, gisRes] = await Promise.all([
          client.get('/merchants', { params }),
          client.get('/gis/nearby', { params }).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;

        const dbMap = new Map(dbRes.data.map(m => [m.YANDEX_FIRM_ID, m]));
        const merged = [...dbRes.data];
        for (const gm of gisRes.data) {
          if (!dbMap.has(gm.YANDEX_FIRM_ID)) merged.push(gm);
        }
        setMerchants(merged);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.error || 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [lat, lon, radiusM]);

  return { merchants, loading, error };
}
