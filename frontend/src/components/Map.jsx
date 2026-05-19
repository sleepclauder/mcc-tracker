import { useEffect, useRef } from 'react';
import { load } from '@2gis/mapgl';
import Supercluster from 'supercluster';
import { useNavigate } from 'react-router-dom';
import { markerIcon, userLocationIcon } from '../utils/mcc';

const LAT_PER_METER = 1 / 111000;
const CLUSTER_MAX_ZOOM = 14;

function toFeatures(merchants) {
  return merchants
    .filter(m => m.LAT != null && m.LON != null)
    .map(m => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [m.LON, m.LAT] },
      properties: m,
    }));
}

// Build bbox from center + radius (avoids getBounds() which may throw before style loads)
function centerToBbox(lon, lat, radiusM = 4000) {
  const dlat = radiusM * LAT_PER_METER;
  const dlon = dlat / Math.cos((lat * Math.PI) / 180);
  return [lon - dlon, lat - dlat, lon + dlon, lat + dlat];
}

function clusterIcon(count) {
  const label = count >= 1000 ? `${Math.floor(count / 1000)}k` : String(count);
  const size = count < 10 ? 36 : count < 100 ? 44 : 52;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#1e88e5" stroke="#fff" stroke-width="3"/>
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
      font-family="sans-serif" font-size="${count < 100 ? 13 : 11}" font-weight="bold" fill="#fff">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function Map({ onCenterChange, merchants = [], onMerchantHover, flyTo, userLocation }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const clusterRef = useRef(null);
  const onMerchantHoverRef = useRef(onMerchantHover);
  const renderRef = useRef(null);
  const flyToRef = useRef(flyTo);
  const navigate = useNavigate();

  onMerchantHoverRef.current = onMerchantHover;

  renderRef.current = function renderClusters() {
    if (!mapRef.current || !clusterRef.current) return;
    const { map, mapgl } = mapRef.current;

    markersRef.current.forEach(m => m.destroy());
    markersRef.current = [];

    try {
      const [lon, lat] = map.getCenter();
      const zoom = Math.floor(map.getZoom());
      const bbox = centerToBbox(lon, lat);
      const clusters = clusterRef.current.getClusters(bbox, zoom);

      clusters.forEach(cluster => {
        const [clon, clat] = cluster.geometry.coordinates;
        const props = cluster.properties;

        if (props.cluster) {
          const marker = new mapgl.Marker(map, {
            coordinates: [clon, clat],
            icon: clusterIcon(props.point_count),
            size: [props.point_count < 10 ? 36 : props.point_count < 100 ? 44 : 52,
                   props.point_count < 10 ? 36 : props.point_count < 100 ? 44 : 52],
          });
          marker.on('click', () => {
            try {
              const expansionZoom = Math.min(clusterRef.current.getClusterExpansionZoom(props.cluster_id), 18);
              map.setCenter([clon, clat], { animate: true });
              map.setZoom(expansionZoom, { animate: true });
            } catch {}
          });
          markersRef.current.push(marker);
        } else {
          const merchant = props;
          const marker = new mapgl.Marker(map, {
            coordinates: [clon, clat],
            icon: markerIcon(merchant.LAST_MCC),
            size: [32, 32],
          });
          marker.on('click', () => navigate(`/merchant/${merchant.YANDEX_FIRM_ID}`, { state: { merchant } }));
          marker.on('mouseover', e => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const x = (e.originalEvent?.clientX ?? 0) - rect.left;
            const y = (e.originalEvent?.clientY ?? 0) - rect.top;
            onMerchantHoverRef.current?.({ merchant, x, y });
          });
          marker.on('mouseout', () => onMerchantHoverRef.current?.(null));
          markersRef.current.push(marker);
        }
      });
    } catch (err) {
      console.error('renderClusters error:', err);
    }
  };

  useEffect(() => {
    load().then(mapgl => {
      if (!containerRef.current || mapRef.current) return;
      const map = new mapgl.Map(containerRef.current, {
        center: [30.3161, 59.9311],
        zoom: 14,
        key: import.meta.env.VITE_2GIS_KEY,
      });
      mapRef.current = { map, mapgl };

      const [initLon, initLat] = map.getCenter();
      onCenterChange?.(initLat, initLon);

      map.on('styleload', () => {
        if (flyToRef.current) {
          map.setCenter([flyToRef.current.lon, flyToRef.current.lat], { animate: false });
        }
        renderRef.current();
      });
      map.on('moveend', () => {
        const [lon, lat] = map.getCenter();
        onCenterChange?.(lat, lon);
        renderRef.current();
      });
    }).catch(err => console.error('mapgl load error:', err));

    return () => {
      markersRef.current.forEach(m => m.destroy());
      markersRef.current = [];
      userMarkerRef.current?.destroy();
      userMarkerRef.current = null;
      mapRef.current?.map.destroy();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    try {
      const sc = new Supercluster({ radius: 60, maxZoom: CLUSTER_MAX_ZOOM });
      sc.load(toFeatures(merchants));
      clusterRef.current = sc;
    } catch (err) {
      console.error('supercluster load error:', err);
    }
    renderRef.current?.();
  }, [merchants]);

  useEffect(() => {
    flyToRef.current = flyTo;
    if (!flyTo || !mapRef.current) return;
    mapRef.current.map.setCenter([flyTo.lon, flyTo.lat], { animate: true });
  }, [flyTo]);

  useEffect(() => {
    if (!userLocation || !mapRef.current) return;
    const { mapgl, map } = mapRef.current;
    userMarkerRef.current?.destroy();
    userMarkerRef.current = new mapgl.Marker(map, {
      coordinates: [userLocation.lon, userLocation.lat],
      icon: userLocationIcon(),
      size: [40, 40],
    });
  }, [userLocation]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
