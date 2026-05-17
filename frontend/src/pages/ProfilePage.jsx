import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { MCC_LABELS, MCC_ICONS } from '../utils/mcc';
import { CITIES, CITY_KEY, CITY_NAME_KEY } from '../utils/cities';
import { useAuth } from '../hooks/useAuth';

const BANK_META = {
  'Т-Банк':           { domain: 'tbank.ru',         color: '#FFDD2D', text: '#000' },
  'Сбер':             { domain: 'sber.ru',           color: '#21A038', text: '#fff' },
  'Альфа-Банк':       { domain: 'alfabank.ru',       color: '#EF3124', text: '#fff' },
  'ВТБ':              { domain: 'vtb.ru',            color: '#009FDF', text: '#fff' },
  'Озон Банк':        { domain: 'ozon.ru',           color: '#005BFF', text: '#fff' },
  'Яндекс Банк':      { domain: 'bank.yandex.ru',   color: '#FC3F1D', text: '#fff' },
  'Газпромбанк':      { domain: 'gazprombank.ru',    color: '#003087', text: '#fff' },
  'ПСБ':              { domain: 'psbank.ru',         color: '#1A2B6B', text: '#fff' },
  'МТС Банк':         { domain: 'mtsbank.ru',        color: '#E30611', text: '#fff' },
  'Россельхозбанк':   { domain: 'rshb.ru',           color: '#00843D', text: '#fff' },
  'Росбанк':          { domain: 'rosbank.ru',        color: '#DD0A34', text: '#fff' },
};

const BANKS = Object.keys(BANK_META);

function BankIcon({ name, size = 24 }) {
  const meta = BANK_META[name];
  if (!meta) return null;
  const src = `https://www.google.com/s2/favicons?domain=${meta.domain}&sz=64`;
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={name}
      className="bank-icon"
      onError={e => {
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'flex';
      }}
      style={{ borderRadius: 6, display: 'block' }}
    />
  );
}

function BankIconFallback({ name, size = 24 }) {
  const meta = BANK_META[name] ?? { color: '#999', text: '#fff' };
  return (
    <span
      className="bank-icon-fallback"
      style={{
        width: size, height: size, background: meta.color, color: meta.text,
        fontSize: size * 0.45, display: 'none', borderRadius: 6,
        alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0,
      }}
    >
      {name[0]}
    </span>
  );
}

function BankBadge({ name, size = 24 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
      <BankIcon name={name} size={size} />
      <BankIconFallback name={name} size={size} />
    </span>
  );
}

const MCC_OPTIONS = Object.entries(MCC_LABELS).map(([code, label]) => ({ code, label }));

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(ym) {
  const [y, m] = ym.split('-');
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  return `${months[Number(m) - 1]} ${y}`;
}

function adjacentMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { userEmail, logout } = useAuth();

  const [month, setMonth] = useState(currentMonth);
  const [preferredCity, setPreferredCity] = useState(
    () => localStorage.getItem(CITY_NAME_KEY) || ''
  );
  const [cards, setCards] = useState([]);
  const [rules, setRules] = useState({});        // cardId → [{mcc_code, cashback_pct}]
  const [dirty, setDirty] = useState({});        // cardId → bool
  const [saving, setSaving] = useState({});       // cardId → bool
  const [addOpen, setAddOpen] = useState(false);
  const [newBank, setNewBank] = useState(BANKS[0]);
  const [newCardName, setNewCardName] = useState('');

  useEffect(() => {
    client.get('/cards').then(r => setCards(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    cards.forEach(card => {
      client.get(`/cards/${card.id}/rules?month=${month}`)
        .then(r => setRules(prev => ({ ...prev, [card.id]: r.data })))
        .catch(() => {});
    });
  }, [cards, month]);

  function addCard() {
    if (!newBank) return;
    client.post('/cards', { bank_name: newBank, card_name: newCardName || null })
      .then(r => {
        setCards(prev => [...prev, r.data]);
        setRules(prev => ({ ...prev, [r.data.id]: [] }));
        setAddOpen(false);
        setNewCardName('');
      })
      .catch(() => {});
  }

  function removeCard(id) {
    client.delete(`/cards/${id}`)
      .then(() => {
        setCards(prev => prev.filter(c => c.id !== id));
        setRules(prev => { const n = { ...prev }; delete n[id]; return n; });
      })
      .catch(() => {});
  }

  function addRule(cardId) {
    const used = (rules[cardId] || []).map(r => r.mcc_code);
    const next = MCC_OPTIONS.find(o => !used.includes(o.code));
    if (!next) return;
    setRules(prev => ({
      ...prev,
      [cardId]: [...(prev[cardId] || []), { mcc_code: next.code, cashback_pct: 1 }],
    }));
    setDirty(prev => ({ ...prev, [cardId]: true }));
  }

  function updateRule(cardId, idx, field, value) {
    setRules(prev => {
      const list = [...(prev[cardId] || [])];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, [cardId]: list };
    });
    setDirty(prev => ({ ...prev, [cardId]: true }));
  }

  function removeRule(cardId, idx) {
    setRules(prev => {
      const list = (prev[cardId] || []).filter((_, i) => i !== idx);
      return { ...prev, [cardId]: list };
    });
    setDirty(prev => ({ ...prev, [cardId]: true }));
  }

  async function saveRules(cardId) {
    setSaving(prev => ({ ...prev, [cardId]: true }));
    try {
      await client.put(`/cards/${cardId}/rules`, {
        month,
        rules: (rules[cardId] || []).map(r => ({
          mcc_code: r.mcc_code,
          cashback_pct: Number(r.cashback_pct),
        })),
      });
      setDirty(prev => ({ ...prev, [cardId]: false }));
    } catch {}
    setSaving(prev => ({ ...prev, [cardId]: false }));
  }

  return (
    <div className="profile-page">
      <header className="app-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Карта</button>
        <span className="logo">
          <svg width="22" height="27" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M20 2C10.6 2 3 9.6 3 19C3 28.4 20 46 20 46C20 46 37 28.4 37 19C37 9.6 29.4 2 20 2Z" fill="#e53935"/>
            <circle cx="15" cy="13.5" r="3" fill="white"/>
            <circle cx="25" cy="23.5" r="3" fill="white"/>
            <line x1="25.5" y1="12.5" x2="14.5" y2="24.5" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          Личный кабинет
        </span>
        <div className="header-controls">
          <span className="profile-email">{userEmail}</span>
          <button className="btn-link" onClick={() => { logout(); navigate('/login'); }}>Выйти</button>
        </div>
      </header>

      <div className="profile-content">
        <div className="profile-month-nav">
          <button className="btn-icon" onClick={() => setMonth(m => adjacentMonth(m, -1))}>‹</button>
          <span className="profile-month-label">{monthLabel(month)}</span>
          <button className="btn-icon" onClick={() => setMonth(m => adjacentMonth(m, 1))}>›</button>
        </div>

        <h2 className="profile-section-title">Мой город</h2>
        <div className="profile-city-grid">
          {CITIES.map(city => (
            <button
              key={city.name}
              className={`profile-city-item${preferredCity === city.name ? ' profile-city-item--active' : ''}`}
              onClick={() => {
                setPreferredCity(city.name);
                try {
                  localStorage.setItem(CITY_NAME_KEY, city.name);
                  localStorage.setItem(CITY_KEY, JSON.stringify({ lat: city.lat, lon: city.lon }));
                } catch {}
              }}
            >
              {city.name}
            </button>
          ))}
        </div>

        <h2 className="profile-section-title">Мои карты</h2>

        {cards.map(card => (
          <div key={card.id} className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title">
                <BankBadge name={card.bank_name} size={28} />
                <span className="profile-card-bank">{card.bank_name}</span>
                {card.card_name && <span className="profile-card-name">{card.card_name}</span>}
              </div>
              <button
                className="btn-danger-sm"
                onClick={() => removeCard(card.id)}
                title="Удалить карту"
              >✕</button>
            </div>

            <div className="profile-rules">
              {(rules[card.id] || []).length === 0 && (
                <p className="profile-rules-empty">Нет категорий для этого месяца</p>
              )}
              {(rules[card.id] || []).map((rule, idx) => {
                const usedCodes = (rules[card.id] || [])
                  .filter((_, i) => i !== idx)
                  .map(r => r.mcc_code);
                return (
                  <div key={idx} className="profile-rule-row">
                    <select
                      className="profile-rule-mcc"
                      value={rule.mcc_code}
                      onChange={e => updateRule(card.id, idx, 'mcc_code', e.target.value)}
                    >
                      {MCC_OPTIONS.map(o => (
                        <option
                          key={o.code}
                          value={o.code}
                          disabled={usedCodes.includes(o.code)}
                        >
                          {MCC_ICONS[o.code]} {o.label}
                        </option>
                      ))}
                    </select>
                    <div className="profile-rule-pct-wrap">
                      <input
                        className="profile-rule-pct"
                        type="number"
                        min="0.1"
                        max="100"
                        step="0.5"
                        value={rule.cashback_pct}
                        onChange={e => updateRule(card.id, idx, 'cashback_pct', e.target.value)}
                      />
                      <span className="profile-rule-pct-sign">%</span>
                    </div>
                    <button
                      className="btn-danger-sm"
                      onClick={() => removeRule(card.id, idx)}
                      title="Удалить категорию"
                    >✕</button>
                  </div>
                );
              })}

              <div className="profile-rules-actions">
                <button
                  className="btn-add-rule"
                  onClick={() => addRule(card.id)}
                  disabled={(rules[card.id] || []).length >= MCC_OPTIONS.length}
                >
                  + Добавить категорию
                </button>
                {dirty[card.id] && (
                  <button
                    className="btn-save-rules"
                    onClick={() => saveRules(card.id)}
                    disabled={saving[card.id]}
                  >
                    {saving[card.id] ? 'Сохраняем…' : 'Сохранить'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {!addOpen && (
          <button className="btn-add-card" onClick={() => setAddOpen(true)}>
            + Добавить карту
          </button>
        )}

        {addOpen && (
          <div className="profile-card profile-add-card">
            <p className="profile-add-title">Новая карта</p>
            <div className="bank-picker">
              {BANKS.map(b => (
                <button
                  key={b}
                  className={`bank-picker-item${newBank === b ? ' bank-picker-item--active' : ''}`}
                  onClick={() => setNewBank(b)}
                  type="button"
                >
                  <BankBadge name={b} size={32} />
                  <span>{b}</span>
                </button>
              ))}
            </div>
            <input
              className="profile-cardname-input"
              type="text"
              placeholder="Название карты (необязательно)"
              value={newCardName}
              onChange={e => setNewCardName(e.target.value)}
            />
            <div className="profile-add-actions">
              <button className="btn-primary" onClick={addCard}>Добавить</button>
              <button className="btn-link" onClick={() => setAddOpen(false)}>Отмена</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
