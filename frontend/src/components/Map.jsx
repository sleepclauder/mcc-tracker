import { useEffect, useRef } from 'react';

export default function Map({ onCenterChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!window.ymaps3 || mapRef.current) return;

    async function init() {
      await window.ymaps3.ready;
      const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer } = window.ymaps3;

      const map = new YMap(containerRef.current, {
        location: { center: [37.617, 55.755], zoom: 15 },
      });
      map.addChild(new YMapDefaultSchemeLayer());
      map.addChild(new YMapDefaultFeaturesLayer());
      mapRef.current = map;

      map.addChild({
        onUpdate({ location }) {
          if (location?.center) {
            const [lon, lat] = location.center;
            onCenterChange?.(lat, lon);
          }
        },
      });
    }

    init();
  }, [onCenterChange]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
