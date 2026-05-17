import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import VoteModal from '../components/VoteModal';
import Toast from '../components/Toast';
import { ArrowLeft } from '../components/Icons';
import { isAuthenticated } from '../utils/auth';
import { mccLabel, MCC_ICONS } from '../utils/mcc';

export default function MerchantPage() {
  const { yandex_firm_id } = useParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showVote, setShowVote] = useState(false);
  const [toast, setToast] = useState(null);

  async function loadStats() {
    setLoading(true);
    try {
      const { data } = await client.get(`/merchants/${yandex_firm_id}/stats`);
      setStats(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStats(); }, [yandex_firm_id]);

  if (loading) return <div className="page-status">Загрузка...</div>;
  if (error)   return <div className="page-status error">{error}</div>;
  if (!stats)  return null;

  return (
    <div className="merchant-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} /> На карту
      </Link>
      <h2>{stats.NAME || 'Магазин'}</h2>
      <p className="address">{stats.ADDRESS}</p>
      <p className="merchant-hint">MCC — код категории торговой точки. Чем точнее код, тем выше кэшбэк по вашей карте.</p>

      <div className="stats-grid">
        <div className="stat">
          <span className="stat-label">Последний MCC</span>
          <span className="stat-value stat-mcc">
            {stats.LAST_MCC && <span className="stat-icon">{MCC_ICONS[stats.LAST_MCC] ?? '🏷'}</span>}
            {mccLabel(stats.LAST_MCC)}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Топ за 30 дней</span>
          <span className="stat-value stat-mcc">
            {stats.TOP_MCC_30D && <span className="stat-icon">{MCC_ICONS[stats.TOP_MCC_30D] ?? '🏷'}</span>}
            {mccLabel(stats.TOP_MCC_30D)}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Голосов всего</span>
          <span className="stat-value">{stats.VOTES_TOTAL}</span>
        </div>
        <div className="stat">
          <span className="stat-label">За 30 дней</span>
          <span className="stat-value">{stats.VOTES_30D}</span>
        </div>
      </div>

      {isAuthenticated()
        ? <button className="btn-primary vote-btn" onClick={() => setShowVote(true)}>Проголосовать за MCC</button>
        : <Link to="/login" className="btn-primary vote-btn">Войдите чтобы проголосовать</Link>
      }

      {showVote && (
        <VoteModal
          merchant={stats}
          onClose={() => setShowVote(false)}
          onSuccess={() => { loadStats(); setToast('Голос учтён!'); }}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
