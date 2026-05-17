import { useState, useCallback } from 'react';
import Map from '../components/Map';
import MerchantList from '../components/MerchantList';
import { useMerchants } from '../hooks/useMerchants';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function MapPage() {
  const [center, setCenter] = useState({ lat: null, lon: null });
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
          <Map onCenterChange={handleCenterChange} />
        </div>
        <aside className="sidebar">
          <h3>Магазины рядом</h3>
          <MerchantList merchants={merchants} loading={loading} error={error} />
        </aside>
      </div>
    </div>
  );
}
