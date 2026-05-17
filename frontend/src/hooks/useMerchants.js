import { useState, useEffect } from 'react';
import client from '../api/client';

export function useMerchants(lat, lon, radiusM = 1000) {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (lat == null || lon == null) return;
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await client.get('/merchants', {
          params: { lat, lon, radius_m: radiusM },
        });
        if (!cancelled) setMerchants(data);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.error || 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [lat, lon, radiusM]);

  return { merchants, loading, error };
}
