import { useState } from 'react';
import client from '../api/client';
import { X } from './Icons';

const COMMON_MCC = [
  { code: '5411', label: 'Продукты', icon: '🛒' },
  { code: '5912', label: 'Аптека', icon: '💊' },
  { code: '5812', label: 'Рестораны', icon: '🍽' },
  { code: '5541', label: 'АЗС', icon: '⛽' },
  { code: '5311', label: 'Универмаги', icon: '🏬' },
  { code: '5999', label: 'Прочее', icon: '🏷' },
];

export default function VoteModal({ merchant, onClose, onSuccess }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleVote() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      await client.post('/votes', {
        yandex_firm_id: merchant.YANDEX_FIRM_ID,
        name: merchant.NAME,
        address: merchant.ADDRESS,
        lat: merchant.LAT,
        lon: merchant.LON,
        mcc_code: selected,
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Ошибка голосования');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Выберите MCC-код</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
        <p className="modal-merchant">{merchant.NAME}</p>
        <div className="mcc-options">
          {COMMON_MCC.map(({ code, label, icon }) => (
            <button
              key={code}
              className={`mcc-option ${selected === code ? 'selected' : ''}`}
              onClick={() => setSelected(code)}
            >
              <span aria-hidden="true">{icon}</span>
              {' '}{label} <small>({code})</small>
            </button>
          ))}
        </div>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button onClick={onClose} disabled={loading}>Отмена</button>
          <button onClick={handleVote} disabled={!selected || loading} className="btn-primary">
            {loading ? 'Сохранение...' : 'Проголосовать'}
          </button>
        </div>
      </div>
    </div>
  );
}
