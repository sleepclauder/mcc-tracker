import { useState } from 'react';
import client from '../api/client';

const COMMON_MCC = [
  { code: '5411', label: 'Продукты (5411)' },
  { code: '5912', label: 'Аптека (5912)' },
  { code: '5812', label: 'Рестораны (5812)' },
  { code: '5541', label: 'АЗС (5541)' },
  { code: '5311', label: 'Универмаги (5311)' },
  { code: '5999', label: 'Прочее (5999)' },
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
        <h3>Выберите MCC-код</h3>
        <p className="modal-merchant">{merchant.NAME}</p>
        <div className="mcc-options">
          {COMMON_MCC.map(({ code, label }) => (
            <button
              key={code}
              className={`mcc-option ${selected === code ? 'selected' : ''}`}
              onClick={() => setSelected(code)}
            >
              {label}
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
