import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Map from '../components/Map';
import MerchantList from '../components/MerchantList';
import { useNearbyMerchants } from '../hooks/useNearbyMerchants';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { MCC_LABELS, MCC_ICONS } from '../utils/mcc';
import { CITY_KEY } from '../utils/cities';
import { MapPin, List } from '../components/Icons';
import Toast from '../components/Toast';
import { getBestCashbackForMcc, BANK_CATEGORIES } from '../utils/bankMcc';
import client from '../api/client';
import { getCurrentUserIsAdmin } from '../utils/auth';
import { Geolocation } from '@capacitor/geolocation';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function UserMenu({ email, onLogout, onProfile, onAdmin }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-menu-trigger" onClick={() => setOpen(o => !o)} title={email}>
        <span className="user-menu-avatar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
        </span>
        <span className="user-menu-caret">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-email">{email}</div>
          <div className="user-menu-divider" />
          <button className="user-menu-item" onClick={() => { setOpen(false); onProfile(); }}>
            Настройки профиля
          </button>
          {onAdmin && (
            <button className="user-menu-item" onClick={() => { setOpen(false); onAdmin(); }}>
              Администрирование
            </button>
          )}
          <button className="user-menu-item user-menu-item--danger" onClick={() => { setOpen(false); onLogout(); }}>
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}


const MCC_CATEGORIES = Object.entries(MCC_LABELS).map(([mcc, label]) => ({
  mcc, label, icon: MCC_ICONS[mcc] ?? '🏷',
}));

export default function MapPage() {
  const [center, setCenter] = useState(() => {
    try {
      const saved = localStorage.getItem(CITY_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { lat: null, lon: null };
  });
  const [flyTo, setFlyTo] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [toast, setToast] = useState(null);
  const [hoveredState, setHoveredState] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedMccs, setSelectedMccs] = useState(new Set());
  const [selectedBank, setSelectedBank] = useState(null);
  const [selectedBankCategories, setSelectedBankCategories] = useState(new Set());

  const { merchants, loading, error } = useNearbyMerchants(center.lat, center.lon, 3000);
  const { authenticated, userEmail, logout } = useAuth();
  const navigate = useNavigate();
  const [bestCashback, setBestCashback] = useState([]); // [{category_name, cashback_pct, bank_name}]

  useEffect(() => {
    if (!authenticated) { setBestCashback([]); return; }
    client.get(`/cards/best?month=${currentMonth()}`)
      .then(r => setBestCashback(r.data))
      .catch(() => {});
  }, [authenticated]);

  function moveTo(lat, lon) {
    setCenter({ lat, lon });
    setFlyTo({ lat, lon });
    try { localStorage.setItem(CITY_KEY, JSON.stringify({ lat, lon })); } catch {}
  }

  async function requestGeolocation() {
    setGeoStatus('loading');
    try {
      await Geolocation.requestPermissions();
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      setGeoStatus('idle');
      setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      moveTo(pos.coords.latitude, pos.coords.longitude);
    } catch {
      setGeoStatus('denied');
      setToast({ message: 'Не удалось определить местоположение — разрешите доступ в настройках', type: 'error' });
    }
  }

  useEffect(() => { requestGeolocation(); }, []);

  const handleCenterChange = useCallback((lat, lon) => {
    setCenter({ lat, lon });
    try { localStorage.setItem(CITY_KEY, JSON.stringify({ lat, lon })); } catch {}
  }, []);


  function toggleMcc(mcc) {
    setSelectedMccs(prev => {
      const next = new Set(prev);
      next.has(mcc) ? next.delete(mcc) : next.add(mcc);
      return next;
    });
  }

  function toggleBankCategory(catName) {
    setSelectedBankCategories(prev => {
      const next = new Set(prev);
      next.has(catName) ? next.delete(catName) : next.add(catName);
      return next;
    });
  }

  function handleBankChange(e) {
    setSelectedBank(e.target.value || null);
    setSelectedBankCategories(new Set());
  }

  function clearFilters() {
    setSelectedMccs(new Set());
    setSelectedBankCategories(new Set());
  }

  const activeBankMccs = selectedBank && selectedBankCategories.size > 0
    ? new Set(
        (BANK_CATEGORIES[selectedBank] || [])
          .filter(c => selectedBankCategories.has(c.name))
          .flatMap(c => c.mccs)
      )
    : null;

  const merchantCashbackMap = useMemo(() => {
    const map = {};
    merchants.forEach(m => {
      if (m.LAST_MCC) {
        const b = getBestCashbackForMcc(m.LAST_MCC, bestCashback);
        if (b) map[m.YANDEX_FIRM_ID] = b;
      }
    });
    return map;
  }, [merchants, bestCashback]);

  const filteredMerchants = merchants.filter(m => {
    if (activeBankMccs) {
      if (!activeBankMccs.has(m.LAST_MCC)) return false;
    } else if (selectedMccs.size > 0 && !selectedMccs.has(m.LAST_MCC)) {
      return false;
    }
    if (query.trim() && !m.NAME?.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const hm = hoveredState?.merchant;

  return (
    <div className="map-page">
      <header className="app-header">
        <span className="logo">
          <svg width="28" height="34" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M20 2C10.6 2 3 9.6 3 19C3 28.4 20 46 20 46C20 46 37 28.4 37 19C37 9.6 29.4 2 20 2Z" fill="#e53935"/>
            <circle cx="15" cy="13.5" r="3" fill="white"/>
            <circle cx="25" cy="23.5" r="3" fill="white"/>
            <line x1="25.5" y1="12.5" x2="14.5" y2="24.5" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          <span>Чек<span style={{color:'#e53935'}}>Бэк</span></span>
        </span>
        <div className="header-controls">
          <button
            className="btn-icon btn-geo"
            onClick={requestGeolocation}
            title="Определить моё местоположение"
            disabled={geoStatus === 'loading'}
          >
            {geoStatus === 'loading' ? '…' : <MapPin size={18} />}
          </button>
          {authenticated && userEmail
            ? <UserMenu
                email={userEmail}
                onLogout={logout}
                onProfile={() => navigate('/profile')}
                onAdmin={getCurrentUserIsAdmin() ? () => navigate('/admin') : null}
              />
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

      <div className="filter-bar">
        <select
          className="bank-filter-select"
          value={selectedBank || ''}
          onChange={handleBankChange}
        >
          <option value="">Все банки</option>
          {Object.keys(BANK_CATEGORIES).map(bank => (
            <option key={bank} value={bank}>{bank}</option>
          ))}
        </select>
        <span className="filter-bar-divider" />
        {selectedBank
          ? (BANK_CATEGORIES[selectedBank] || []).map(cat => (
              <button
                key={cat.name}
                className={`mcc-chip${selectedBankCategories.has(cat.name) ? ' mcc-chip--active' : ''}`}
                onClick={() => toggleBankCategory(cat.name)}
              >
                {cat.name}
              </button>
            ))
          : MCC_CATEGORIES.map(({ mcc, label, icon }) => (
              <button
                key={mcc}
                className={`mcc-chip${selectedMccs.has(mcc) ? ' mcc-chip--active' : ''}`}
                onClick={() => toggleMcc(mcc)}
              >
                {icon} {label}
              </button>
            ))
        }
        {(selectedMccs.size > 0 || selectedBankCategories.size > 0) && (
          <button className="mcc-chip-clear" onClick={clearFilters}>
            Сбросить
          </button>
        )}
      </div>

      <div className="map-layout">
        <div className="map-container" onClick={() => { if (hoveredState?.pinned) setHoveredState(null); }}>
          {loading && center.lat !== null && (
            <div className="map-loading">
              <span className="map-loading-spinner" />
              Загрузка...
            </div>
          )}
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
            merchants={filteredMerchants}
            onMerchantHover={setHoveredState}
            flyTo={flyTo}
            userLocation={userLocation}
            merchantCashback={merchantCashbackMap}
          />
          {hm && (
            <div
              className={`map-tooltip${hoveredState.pinned ? ' map-tooltip--pinned' : ''}`}
              style={{ left: hoveredState.x + 14, top: hoveredState.y }}
              onClick={e => e.stopPropagation()}
            >
              {hoveredState.pinned && (
                <button className="map-tooltip-close" onClick={() => setHoveredState(null)}>×</button>
              )}
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
              {hm.LAST_MCC && (() => { const b = getBestCashbackForMcc(hm.LAST_MCC, bestCashback); return b ? (
                <span className="map-tooltip-cashback">💳 {b.bank} {b.pct}%</span>
              ) : null; })()}
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
          <MerchantList merchants={filteredMerchants} loading={loading} error={error} />
        </aside>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
