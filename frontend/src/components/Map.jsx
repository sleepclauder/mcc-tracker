import { useEffect, useRef } from 'react';
import { load } from '@2gis/mapgl';

export default function Map({ onCenterChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let map;

    load().then((mapgl) => {
      if (!containerRef.current || mapRef.current) return;

      map = new mapgl.Map(containerRef.current, {
        center: [37.617, 55.755],
        zoom: 15,
        key: import.meta.env.VITE_2GIS_KEY,
      });
      mapRef.current = map;

      map.on('moveend', () => {
        const [lon, lat] = map.getCenter();
        onCenterChange?.(lat, lon);
      });
    });

    return () => {
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, [onCenterChange]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
