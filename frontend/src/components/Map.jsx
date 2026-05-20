import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Supercluster from 'supercluster';
import { useNavigate } from 'react-router-dom';
import { markerIcon, userLocationIcon } from '../utils/mcc';

const LAT_PER_METER = 1 / 111000;
const CLUSTER_MAX_ZOOM = 14;
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

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

// div avoids <img> drag behaviour that swallows click events
function createMarkerEl(svgUri, size) {
  const el = document.createElement('div');
  el.style.width = size + 'px';
  el.style.height = size + 'px';
  el.style.backgroundImage = `url("${svgUri}")`;
  el.style.backgroundSize = 'contain';
  el.style.backgroundRepeat = 'no-repeat';
  el.style.cursor = 'pointer';
  return el;
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
    const map = mapRef.current;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    try {
      const { lng, lat } = map.getCenter();
      const zoom = Math.floor(map.getZoom());
      const bbox = centerToBbox(lng, lat);
      const clusters = clusterRef.current.getClusters(bbox, zoom);

      clusters.forEach(cluster => {
        const [clon, clat] = cluster.geometry.coordinates;
        const props = cluster.properties;

        if (props.cluster) {
          const size = props.point_count < 10 ? 36 : props.point_count < 100 ? 44 : 52;
          const el = createMarkerEl(clusterIcon(props.point_count), size);
          const marker = new maplibregl.Marker({ element: el }).setLngLat([clon, clat]).addTo(map);
          // pointerup: MapLibre cancels mousedown on marker elements, which prevents click
          el.addEventListener('pointerup', () => {
            try {
              const expansionZoom = Math.min(clusterRef.current.getClusterExpansionZoom(props.cluster_id), 18);
              map.easeTo({ center: [clon, clat], zoom: expansionZoom });
            } catch {}
          });
          markersRef.current.push(marker);
        } else {
          const merchant = props;
          const el = createMarkerEl(markerIcon(merchant.LAST_MCC), 32);
          const marker = new maplibregl.Marker({ element: el }).setLngLat([clon, clat]).addTo(map);
          el.addEventListener('pointerup', () => navigate(`/merchant/${merchant.YANDEX_FIRM_ID}`, { state: { merchant } }));
          el.addEventListener('mouseover', e => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            onMerchantHoverRef.current?.({ merchant, x, y });
          });
          el.addEventListener('mouseout', () => onMerchantHoverRef.current?.(null));
          markersRef.current.push(marker);
        }
      });
    } catch (err) {
      console.error('renderClusters error:', err);
    }
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [30.3161, 59.9311],
      zoom: 14,
    });
    mapRef.current = map;

    map.on('load', () => {
      // Hide map's built-in POI layers — we render our own merchant markers
      map.getStyle().layers.forEach(layer => {
        if (layer.id.startsWith('poi')) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      });
      // Show house numbers from zoom 14 (liberty style default is 17+)
      try { map.setLayerZoomRange('housenumber', 14, 24); } catch {}

      const { lng, lat } = map.getCenter();
      onCenterChange?.(lat, lng);
      // Apply flyTo if geolocation resolved before map finished loading
      if (flyToRef.current) {
        map.setCenter([flyToRef.current.lon, flyToRef.current.lat]);
      }
      renderRef.current();
    });

    map.on('moveend', () => {
      const { lng, lat } = map.getCenter();
      onCenterChange?.(lat, lng);
      renderRef.current();
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      mapRef.current?.remove();
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
    mapRef.current.easeTo({ center: [flyTo.lon, flyTo.lat] });
  }, [flyTo]);

  useEffect(() => {
    if (!userLocation || !mapRef.current) return;
    userMarkerRef.current?.remove();
    const el = createMarkerEl(userLocationIcon(), 40);
    userMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([userLocation.lon, userLocation.lat])
      .addTo(mapRef.current);
  }, [userLocation]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
