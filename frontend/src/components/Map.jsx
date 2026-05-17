import { useEffect, useRef } from 'react';
import { load } from '@2gis/mapgl';
import { useNavigate } from 'react-router-dom';

export default function Map({ onCenterChange, merchants = [], onMerchantHover }) {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null); // { map, mapgl }
  const markersRef = useRef([]);
  const merchantsRef = useRef(merchants);
  const onMerchantHoverRef = useRef(onMerchantHover);
  const navigate = useNavigate();

  merchantsRef.current = merchants;
  onMerchantHoverRef.current = onMerchantHover;

  function renderMarkers(map, mapgl, merchantList) {
    markersRef.current.forEach(m => m.destroy());
    markersRef.current = [];
    merchantList.forEach(merchant => {
      const marker = new mapgl.Marker(map, {
        coordinates: [merchant.LON, merchant.LAT],
      });
      marker.on('click', () => navigate(`/merchant/${merchant.YANDEX_FIRM_ID}`));
      marker.on('mouseover', () => onMerchantHoverRef.current?.(merchant));
      marker.on('mouseout', () => onMerchantHoverRef.current?.(null));
      markersRef.current.push(marker);
    });
  }

  useEffect(() => {
    load().then((mapgl) => {
      if (!containerRef.current || mapInstanceRef.current) return;
      const map = new mapgl.Map(containerRef.current, {
        center: [30.3161, 59.9311],
        zoom: 14,
        key: import.meta.env.VITE_2GIS_KEY,
      });
      mapInstanceRef.current = { map, mapgl };
      map.on('moveend', () => {
        const [lon, lat] = map.getCenter();
        onCenterChange?.(lat, lon);
      });
      renderMarkers(map, mapgl, merchantsRef.current);
    });

    return () => {
      markersRef.current.forEach(m => m.destroy());
      markersRef.current = [];
      mapInstanceRef.current?.map.destroy();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const { map, mapgl } = mapInstanceRef.current;
    renderMarkers(map, mapgl, merchants);
  }, [merchants]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
