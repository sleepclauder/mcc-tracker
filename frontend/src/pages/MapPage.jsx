import { useState, useCallback, useEffect } from 'react';
import Map from '../components/Map';
import MerchantList from '../components/MerchantList';
import { useMerchants } from '../hooks/useMerchants';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const MCC_LABELS = {
  '5411': 'Продукты',
  '5912': 'Аптека',
  '5812': 'Ресторан',
  '5541': 'АЗС',
  '5311': 'Универмаг',
  '5999': 'Прочее',
};

const CITIES = [
  { name: 'Санкт-Петербург', lat: 59.9311, lon: 30.3161 },
  { name: 'Москва',           lat: 55.7558, lon: 37.6173 },
  { name: 'Новосибирск',      lat: 54.9885, lon: 82.9207 },
  { name: 'Екатеринбург',     lat: 56.8389, lon: 60.6057 },
  { name: 'Казань',           lat: 55.7887, lon: 49.1221 },
  { name: 'Нижний Новгород',  lat: 56.2965, lon: 43.9361 },
  { name: 'Краснодар',        lat: 45.0328, lon: 38.9769 },
  { name: 'Самара',           lat: 53.2001, lon: 50.1500 },
  { name: 'Омск',             lat: 54.9885, lon: 73.3242 },
  { name: 'Ростов-на-Дону',   lat: 47.2357, lon: 39.7015 },
];

export default function MapPage() {
  const [center, setCenter] = useState({ lat: null, lon: null });
  const [flyTo, setFlyTo] = useState(null);
  const [hoveredMerchant, setHoveredMerchant] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | loading | denied
  const { merchants, loading, error } = useMerchants(center.lat, center.lon, 1000);
  const { authenticated, logout } = useAuth();
  const navigate = useNavigate();

  function moveTo(lat, lon) {
    setCenter({ lat, lon });
    setFlyTo({ lat, lon });
  }

  function requestGeolocation() {
    if (!navigator.geolocation) { setGeoStatus('denied'); return; }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGeoStatus('idle');
        moveTo(coords.latitude, coords.longitude);
      },
      () => setGeoStatus('denied')
    );
  }

  useEffect(() => { requestGeolocation(); }, []);

  const handleCenterChange = useCallback((lat, lon) => {
    setCenter({ lat, lon });
  }, []);

  function handleCitySelect(e) {
    const city = CITIES.find(c => c.name === e.target.value);
    if (city) moveTo(city.lat, city.lon);
  }

  return (
    <div className="map-page">
      <header className="app-header">
        <span className="logo">MCC Tracker</span>
        <div className="header-controls">
          <button
            className="btn-geo"
            onClick={requestGeolocation}
            title="Определить моё местоположение"
            disabled={geoStatus === 'loading'}
          >
            {geoStatus === 'loading' ? '...' : '📍'}
          </button>
          <select className="city-select" onChange={handleCitySelect} defaultValue="">
            <option value="" disabled>Выбрать город</option>
            {CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          {authenticated
            ? <button className="btn-link" onClick={logout}>Выйти</button>
            : <button className="btn-link" onClick={() => navigate('/login')}>Войти</button>
          }
        </div>
      </header>
      <div className="map-layout">
        <div className="map-container">
          <Map
            onCenterChange={handleCenterChange}
            merchants={merchants}
            onMerchantHover={setHoveredMerchant}
            flyTo={flyTo}
          />
          {hoveredMerchant && (
            <div className="map-tooltip">
              <strong>{hoveredMerchant.NAME}</strong>
              <span>{hoveredMerchant.ADDRESS}</span>
              {hoveredMerchant.LAST_MCC && (
                <span>Последний: {MCC_LABELS[hoveredMerchant.LAST_MCC] || hoveredMerchant.LAST_MCC} ({hoveredMerchant.LAST_MCC})</span>
              )}
              {hoveredMerchant.TOP_MCC_30D && (
                <span>Топ 30д: {MCC_LABELS[hoveredMerchant.TOP_MCC_30D] || hoveredMerchant.TOP_MCC_30D} ({hoveredMerchant.TOP_MCC_30D})</span>
              )}
              {hoveredMerchant.VOTES_TOTAL > 0 && (
                <span>{hoveredMerchant.VOTES_TOTAL} голос(ов)</span>
              )}
            </div>
          )}
        </div>
        <aside className="sidebar">
          <h3>Магазины рядом</h3>
          <MerchantList merchants={merchants} loading={loading} error={error} />
        </aside>
      </div>
    </div>
  );
}
