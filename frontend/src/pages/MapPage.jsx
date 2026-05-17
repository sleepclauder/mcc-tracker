import { useState, useCallback, useEffect } from 'react';
import Map from '../components/Map';
import MerchantList from '../components/MerchantList';
import { useMerchants } from '../hooks/useMerchants';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { MCC_LABELS, MCC_ICONS } from '../utils/mcc';
import { MapPin, List } from '../components/Icons';

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
  const [hoveredState, setHoveredState] = useState(null); // { merchant, x, y }
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | loading | denied
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedMcc, setSelectedMcc] = useState(null);
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

  const availableMccs = [...new Set(merchants.map(m => m.LAST_MCC).filter(Boolean))];

  const filteredMerchants = merchants.filter(m => {
    if (selectedMcc && m.LAST_MCC !== selectedMcc) return false;
    if (query.trim() && !m.NAME?.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const hm = hoveredState?.merchant;

  return (
    <div className="map-page">
      <header className="app-header">
        <span className="logo">MCC Tracker</span>
        <div className="header-controls">
          <button
            className="btn-icon btn-geo"
            onClick={requestGeolocation}
            title="Определить моё местоположение"
            disabled={geoStatus === 'loading'}
          >
            {geoStatus === 'loading' ? '…' : <MapPin size={18} />}
          </button>
          <select className="city-select" onChange={handleCitySelect} defaultValue="">
            <option value="" disabled>Выбрать город</option>
            {CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          {authenticated
            ? <button className="btn-link" onClick={logout}>Выйти</button>
            : <button className="btn-link" onClick={() => navigate('/login')}>Войти</button>
          }
          <button
            className="btn-icon btn-sidebar-toggle"
            onClick={() => setSidebarOpen(o => !o)}
            title="Список магазинов"
            aria-label="Список магазинов"
          >
            <List size={18} />
          </button>
        </div>
      </header>
      <div className="map-layout">
        <div className="map-container">
          {center.lat === null && geoStatus !== 'loading' && (
            <div className="map-empty-overlay">
              <MapPin size={36} style={{ color: '#e53935' }} />
              <p>Разрешите доступ к геолокации</p>
              <p className="map-empty-hint">или выберите город в меню выше</p>
              <button className="btn-primary" onClick={requestGeolocation}>
                Определить местоположение
              </button>
            </div>
          )}
          <Map
            onCenterChange={handleCenterChange}
            merchants={merchants}
            onMerchantHover={setHoveredState}
            flyTo={flyTo}
          />
          {hm && (
            <div
              className="map-tooltip"
              style={{ left: hoveredState.x + 14, top: hoveredState.y }}
            >
              <strong>{hm.NAME}</strong>
              <span>{hm.ADDRESS}</span>
              {hm.LAST_MCC && (
                <span>Последний: {MCC_LABELS[hm.LAST_MCC] || hm.LAST_MCC} ({hm.LAST_MCC})</span>
              )}
              {hm.TOP_MCC_30D && (
                <span>Топ 30д: {MCC_LABELS[hm.TOP_MCC_30D] || hm.TOP_MCC_30D} ({hm.TOP_MCC_30D})</span>
              )}
              {hm.VOTES_TOTAL > 0 && (
                <span>{hm.VOTES_TOTAL} голос(ов)</span>
              )}
            </div>
          )}
        </div>
        <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
          <h3>Магазины рядом {!loading && <span className="sidebar-count">({filteredMerchants.length})</span>}</h3>
          <input
            className="sidebar-search"
            type="search"
            placeholder="Поиск по названию..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {availableMccs.length > 0 && (
            <div className="mcc-filter-chips">
              {availableMccs.map(mcc => (
                <button
                  key={mcc}
                  className={`mcc-chip${selectedMcc === mcc ? ' mcc-chip--active' : ''}`}
                  onClick={() => setSelectedMcc(selectedMcc === mcc ? null : mcc)}
                >
                  {MCC_ICONS[mcc] ?? '🏷'} {MCC_LABELS[mcc] ?? mcc}
                </button>
              ))}
            </div>
          )}
          <MerchantList merchants={filteredMerchants} loading={loading} error={error} />
        </aside>
      </div>
    </div>
  );
}
