import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import client from '../api/client';
import VoteModal from '../components/VoteModal';
import Toast from '../components/Toast';
import { ArrowLeft } from '../components/Icons';
import { isAuthenticated } from '../utils/auth';
import { mccLabel, MCC_ICONS } from '../utils/mcc';
import { getMccBankCoverage, getAllCashbacksForMcc } from '../utils/bankMcc';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function GisReviewsLink({ gisUrl }) {
  if (!gisUrl) return null;
  return (
    <a
      href={`${gisUrl}/tab/reviews`}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-secondary gis-reviews-btn"
    >
      ★ Отзывы в 2GIS
    </a>
  );
}

function BankCoverage({ mcc }) {
  if (!mcc) return null;
  const coverage = getMccBankCoverage(mcc);
  if (!coverage.length) return null;
  return (
    <div className="bank-coverage">
      <p className="bank-coverage-title">Кешбэк у банков для MCC {mcc}</p>
      <div className="bank-coverage-list">
        {coverage.map(({ bank, category }) => (
          <div key={bank} className="bank-coverage-row">
            <span className="bank-coverage-name">{bank}</span>
            <span className="bank-coverage-cat">{category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MerchantPage() {
  const { yandex_firm_id } = useParams();
  const location = useLocation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showVote, setShowVote] = useState(false);
  const [toast, setToast] = useState(null);
  const [userCashbacks, setUserCashbacks] = useState([]);

  async function loadStats() {
    setLoading(true);
    try {
      const { data } = await client.get(`/merchants/${yandex_firm_id}/stats`);
      setStats(data);
    } catch (e) {
      const isNotFound = e.response?.status === 404;
      const fallback = location.state?.merchant;
      if (isNotFound && fallback) {
        setStats({ ...fallback, VOTES_TOTAL: 0, VOTES_30D: 0, LAST_MCC: null, TOP_MCC_30D: null });
      } else {
        setError(e.response?.data?.error || 'Ошибка загрузки');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStats(); }, [yandex_firm_id]);

  useEffect(() => {
    if (!isAuthenticated()) return;
    client.get(`/cards/best?month=${currentMonth()}`)
      .then(r => setUserCashbacks(r.data))
      .catch(() => {});
  }, []);

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
      {stats.GIS_RATING && (
        <p className="merchant-gis-rating">
          <span className="gis-star">★</span>
          <strong>{Number(stats.GIS_RATING).toFixed(1)}</strong>
          {stats.GIS_REVIEW_COUNT > 0 && (
            <span className="gis-reviews"> · {stats.GIS_REVIEW_COUNT} отзыв(ов) в 2GIS</span>
          )}
        </p>
      )}
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

      <BankCoverage mcc={stats.TOP_MCC_30D || stats.LAST_MCC} />

      {(() => {
        const mcc = stats.TOP_MCC_30D || stats.LAST_MCC;
        if (!mcc || !isAuthenticated()) return null;
        const cashbacks = getAllCashbacksForMcc(mcc, userCashbacks);
        if (!cashbacks.length) return null;
        return (
          <div className="bank-coverage">
            <p className="bank-coverage-title">Ваши карты для MCC {mcc}</p>
            <div className="bank-coverage-list">
              {cashbacks.map(({ bank, pct, category }) => (
                <div key={bank} className="bank-coverage-row">
                  <span className="bank-coverage-name">{bank}</span>
                  <span className="bank-coverage-cat">{category}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#2e7d32' }}>{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="merchant-actions">
        {isAuthenticated()
          ? <button className="btn-primary vote-btn" onClick={() => setShowVote(true)}>Проголосовать за MCC</button>
          : <Link to="/login" className="btn-primary vote-btn">Войдите чтобы проголосовать</Link>
        }
        <GisReviewsLink gisUrl={stats.GIS_URL} />
      </div>

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
