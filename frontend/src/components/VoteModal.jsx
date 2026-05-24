import { useState } from 'react';
import client from '../api/client';
import { X } from './Icons';
import { getMccBankCoverage } from '../utils/bankMcc';

export default function VoteModal({ merchant, onClose, onSuccess }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isValid = /^\d{4}$/.test(code);
  const coverage = isValid ? getMccBankCoverage(code) : [];

  function handleInput(val) {
    setCode(val.replace(/\D/g, '').slice(0, 4));
    setError(null);
  }

  async function handleVote() {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      await client.post('/votes', {
        yandex_firm_id: merchant.YANDEX_FIRM_ID,
        name: merchant.NAME,
        address: merchant.ADDRESS,
        lat: merchant.LAT,
        lon: merchant.LON,
        mcc_code: code,
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      const status = e.response?.status;
      const msg = e.response?.data?.error;
      setError(msg || (status ? `Ошибка ${status}` : `Нет ответа от сервера: ${e.message}`));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Введите MCC-код</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
        <p className="modal-merchant">{merchant.NAME}</p>
        <input
          className="mcc-code-input"
          type="text"
          inputMode="numeric"
          placeholder="Например: 5411"
          value={code}
          onChange={e => handleInput(e.target.value)}
          autoFocus
        />
        {isValid && coverage.length > 0 && (
          <div className="mcc-coverage">
            {coverage.map(({ bank, category }) => (
              <span key={bank} className="mcc-bank-tag">{bank}: {category}</span>
            ))}
          </div>
        )}
        {isValid && coverage.length === 0 && (
          <p className="mcc-coverage-none">Код не найден в базе банков — всё равно можно проголосовать.</p>
        )}
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button onClick={onClose} disabled={loading}>Отмена</button>
          <button onClick={handleVote} disabled={!isValid || loading} className="btn-primary">
            {loading ? 'Сохранение...' : 'Проголосовать'}
          </button>
        </div>
      </div>
    </div>
  );
}
