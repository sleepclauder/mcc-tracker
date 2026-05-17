import { useState, useCallback } from 'react';
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

export default function MapPage() {
  const [center, setCenter] = useState({ lat: null, lon: null });
  const [hoveredMerchant, setHoveredMerchant] = useState(null);
  const { merchants, loading, error } = useMerchants(center.lat, center.lon, 1000);
  const { authenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleCenterChange = useCallback((lat, lon) => {
    setCenter({ lat, lon });
  }, []);

  return (
    <div className="map-page">
      <header className="app-header">
        <span className="logo">MCC Tracker</span>
        <nav>
          {authenticated
            ? <button className="btn-link" onClick={logout}>Выйти</button>
            : <button className="btn-link" onClick={() => navigate('/login')}>Войти</button>
          }
        </nav>
      </header>
      <div className="map-layout">
        <div className="map-container">
          <Map
            onCenterChange={handleCenterChange}
            merchants={merchants}
            onMerchantHover={setHoveredMerchant}
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
