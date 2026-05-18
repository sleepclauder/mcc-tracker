import { useEffect, useRef } from 'react';
import { load } from '@2gis/mapgl';
import Supercluster from 'supercluster';
import { useNavigate } from 'react-router-dom';
import { markerIcon, userLocationIcon } from '../utils/mcc';

function toFeatures(merchants) {
  return merchants
    .filter(m => m.LAT != null && m.LON != null)
    .map(m => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [m.LON, m.LAT] },
      properties: m,
    }));
}

function clusterEl(count) {
  const size = count < 10 ? 36 : count < 100 ? 44 : 52;
  const label = count >= 1000 ? `${Math.floor(count / 1000)}k` : String(count);
  const el = document.createElement('div');
  el.style.cssText = [
    `width:${size}px`, `height:${size}px`, 'border-radius:50%',
    'background:#1e88e5', 'border:3px solid #fff',
    'box-shadow:0 2px 6px rgba(0,0,0,.3)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'color:#fff', `font-weight:700`, `font-size:${count < 100 ? 13 : 11}px`,
    'cursor:pointer', 'font-family:sans-serif', 'user-select:none',
  ].join(';');
  el.textContent = label;
  return { el, size };
}

export default function Map({ onCenterChange, merchants = [], onMerchantHover, flyTo, userLocation }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const clusterRef = useRef(null);
  const onMerchantHoverRef = useRef(onMerchantHover);
  const renderRef = useRef(null);
  const navigate = useNavigate();

  onMerchantHoverRef.current = onMerchantHover;

  renderRef.current = function renderClusters() {
    if (!mapRef.current || !clusterRef.current) return;
    const { map, mapgl } = mapRef.current;

    markersRef.current.forEach(m => m.destroy());
    markersRef.current = [];

    const bounds = map.getBounds();
    if (!bounds) return;
    const zoom = Math.floor(map.getZoom());
    const bbox = [bounds.southWest[0], bounds.southWest[1], bounds.northEast[0], bounds.northEast[1]];
    const clusters = clusterRef.current.getClusters(bbox, zoom);

    clusters.forEach(cluster => {
      const [lon, lat] = cluster.geometry.coordinates;
      const props = cluster.properties;

      if (props.cluster) {
        const { el, size } = clusterEl(props.point_count);
        const half = size / 2;
        const marker = new mapgl.HtmlMarker(map, {
          coordinates: [lon, lat],
          html: el,
          anchor: [half, half],
        });
        el.addEventListener('click', () => {
          const expansionZoom = Math.min(clusterRef.current.getClusterExpansionZoom(props.cluster_id), 18);
          map.setCenter([lon, lat], { animate: true });
          map.setZoom(expansionZoom, { animate: true });
        });
        markersRef.current.push(marker);
      } else {
        const merchant = props;
        const marker = new mapgl.Marker(map, {
          coordinates: [lon, lat],
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

      map.on('styleload', () => renderRef.current());
      map.on('moveend', () => {
        const [lon, lat] = map.getCenter();
        onCenterChange?.(lat, lon);
        renderRef.current();
      });
    });

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
    const sc = new Supercluster({ radius: 60, maxZoom: 16 });
    sc.load(toFeatures(merchants));
    clusterRef.current = sc;
    renderRef.current?.();
  }, [merchants]);

  useEffect(() => {
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
