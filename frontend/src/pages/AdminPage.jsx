import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const PAGE_SIZE = 20;

const S = {
  page: { minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui, sans-serif' },
  header: { background: '#1a1a2e', color: '#fff', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 },
  backBtn: { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 20, lineHeight: 1 },
  title: { margin: 0, fontSize: 18, fontWeight: 600 },
  body: { padding: 20, maxWidth: 1100, margin: '0 auto' },
  searchRow: { display: 'flex', gap: 8, marginBottom: 16 },
  input: { flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 },
  btn: { padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  btnPrimary: { background: '#1a1a2e', color: '#fff' },
  btnDanger: { background: '#e53935', color: '#fff' },
  btnGhost: { background: '#eee', color: '#333' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.08)' },
  th: { padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', borderBottom: '1px solid #eee', background: '#fafafa' },
  td: { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 },
  pager: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 13, color: '#666' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 10, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,.18)' },
  modalTitle: { margin: '0 0 16px', fontSize: 17, fontWeight: 600 },
  field: { marginBottom: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 },
  checkRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 14 },
  actionsRow: { display: 'flex', gap: 8, marginTop: 20 },
  sectionTitle: { margin: '20px 0 8px', fontSize: 14, fontWeight: 600, color: '#333' },
  voteRow: { padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 },
};

function formatDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function Badge({ value, trueLabel = 'Да', trueColor = '#43a047', falseLabel = 'Нет', falseColor = '#bbb' }) {
  return (
    <span style={{ ...S.badge, background: value ? trueColor : falseColor, color: '#fff' }}>
      {value ? trueLabel : falseLabel}
    </span>
  );
}

function EditModal({ user, onClose, onSaved }) {
  const [email, setEmail] = useState(user.EMAIL);
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(Boolean(user.IS_ADMIN));
  const [isBlocked, setIsBlocked] = useState(Boolean(user.IS_BLOCKED));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [votes, setVotes] = useState(null);
  const [votesOffset, setVotesOffset] = useState(0);
  const [votesTotal, setVotesTotal] = useState(0);
  const [loadingVotes, setLoadingVotes] = useState(false);
  const [showVotes, setShowVotes] = useState(false);

  const loadVotes = useCallback(async (offset = 0) => {
    setLoadingVotes(true);
    try {
      const { data } = await client.get(`/admin/users/${user.ID}/votes?offset=${offset}`);
      setVotes(data.votes);
      setVotesOffset(offset);
      setVotesTotal(data.total);
    } catch {
      // ignore
    } finally {
      setLoadingVotes(false);
    }
  }, [user.ID]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const body = { is_admin: isAdmin, is_blocked: isBlocked };
      if (email !== user.EMAIL) body.email = email;
      if (password) body.password = password;
      await client.put(`/admin/users/${user.ID}`, body);
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <p style={S.modalTitle}>Редактировать пользователя #{user.ID}</p>

        <div style={S.field}>
          <label style={S.label}>Email</label>
          <input style={{ ...S.input, width: '100%', boxSizing: 'border-box' }}
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div style={S.field}>
          <label style={S.label}>Новый пароль (оставьте пустым, чтобы не менять)</label>
          <input style={{ ...S.input, width: '100%', boxSizing: 'border-box' }}
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Минимум 8 символов" />
        </div>

        <div style={S.checkRow}>
          <input type="checkbox" id="is_admin" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} />
          <label htmlFor="is_admin">Администратор</label>
        </div>

        <div style={S.checkRow}>
          <input type="checkbox" id="is_blocked" checked={isBlocked} onChange={e => setIsBlocked(e.target.checked)} />
          <label htmlFor="is_blocked">Заблокирован</label>
        </div>

        {error && <p style={{ color: '#e53935', fontSize: 13 }}>{error}</p>}

        <div style={S.actionsRow}>
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
          <button style={{ ...S.btn, ...S.btnGhost }} onClick={onClose}>Отмена</button>
          <button style={{ ...S.btn, ...S.btnGhost, marginLeft: 'auto' }}
            onClick={() => { setShowVotes(true); loadVotes(0); }}>
            История голосований ({user.VOTE_COUNT})
          </button>
        </div>

        {showVotes && (
          <>
            <p style={S.sectionTitle}>История голосований — {votesTotal} записей</p>
            {loadingVotes && <p style={{ fontSize: 13, color: '#999' }}>Загрузка…</p>}
            {votes && votes.map(v => (
              <div key={v.ID} style={S.voteRow}>
                <strong>{v.MCC_CODE}</strong> — {v.NAME}
                {v.ADDRESS ? `, ${v.ADDRESS}` : ''}{' '}
                <span style={{ color: '#999' }}>{formatDate(v.CREATED_AT)}</span>
              </div>
            ))}
            {votes && votesTotal > PAGE_SIZE && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button style={{ ...S.btn, ...S.btnGhost }}
                  disabled={votesOffset === 0}
                  onClick={() => loadVotes(votesOffset - PAGE_SIZE)}>← Назад</button>
                <button style={{ ...S.btn, ...S.btnGhost }}
                  disabled={votesOffset + PAGE_SIZE >= votesTotal}
                  onClick={() => loadVotes(votesOffset + PAGE_SIZE)}>Вперёд →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = useCallback(async (q, off) => {
    setLoading(true);
    try {
      const { data } = await client.get(`/admin/users?q=${encodeURIComponent(q)}&offset=${off}`);
      setUsers(data.users);
      setTotal(data.total);
      setOffset(off);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load('', 0); }, [load]);

  function search() {
    setQuery(inputVal);
    load(inputVal, 0);
  }

  async function handleDelete(userId) {
    try {
      await client.delete(`/admin/users/${userId}`);
      setDeleteConfirm(null);
      load(query, offset);
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка удаления');
    }
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate('/')}>←</button>
        <h1 style={S.title}>Администрирование</h1>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#aaa' }}>{total} пользователей</span>
      </div>

      <div style={S.body}>
        <div style={S.searchRow}>
          <input style={S.input} placeholder="Поиск по email…"
            value={inputVal} onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()} />
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={search}>Найти</button>
        </div>

        {loading ? (
          <p style={{ color: '#999', fontSize: 14 }}>Загрузка…</p>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                {['ID', 'Email', 'Зарегистрирован', 'Голосов', 'Админ', 'Заблокирован', 'Действия'].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#999' }}>Ничего не найдено</td></tr>
              )}
              {users.map(u => (
                <tr key={u.ID}>
                  <td style={S.td}>{u.ID}</td>
                  <td style={S.td}>{u.EMAIL}</td>
                  <td style={S.td}>{formatDate(u.CREATED_AT)}</td>
                  <td style={S.td}>{u.VOTE_COUNT}</td>
                  <td style={S.td}><Badge value={u.IS_ADMIN} trueColor="#1a1a2e" /></td>
                  <td style={S.td}><Badge value={u.IS_BLOCKED} trueLabel="Да" trueColor="#e53935" falseLabel="Нет" /></td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ ...S.btn, ...S.btnGhost, padding: '4px 10px' }}
                        onClick={() => setEditUser(u)}>Изменить</button>
                      <button style={{ ...S.btn, ...S.btnDanger, padding: '4px 10px' }}
                        onClick={() => setDeleteConfirm(u)}>Удалить</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {total > PAGE_SIZE && (
          <div style={S.pager}>
            <button style={{ ...S.btn, ...S.btnGhost }}
              disabled={offset === 0} onClick={() => load(query, offset - PAGE_SIZE)}>← Назад</button>
            <span>{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} из {total}</span>
            <button style={{ ...S.btn, ...S.btnGhost }}
              disabled={offset + PAGE_SIZE >= total} onClick={() => load(query, offset + PAGE_SIZE)}>Вперёд →</button>
          </div>
        )}
      </div>

      {editUser && (
        <EditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); load(query, offset); }}
        />
      )}

      {deleteConfirm && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div style={{ ...S.modal, maxWidth: 380 }}>
            <p style={S.modalTitle}>Удалить аккаунт?</p>
            <p style={{ fontSize: 14, color: '#555' }}>
              Аккаунт <strong>{deleteConfirm.EMAIL}</strong> и все его данные (голоса, карты) будут удалены без возможности восстановления.
            </p>
            <div style={S.actionsRow}>
              <button style={{ ...S.btn, ...S.btnDanger }} onClick={() => handleDelete(deleteConfirm.ID)}>
                Удалить
              </button>
              <button style={{ ...S.btn, ...S.btnGhost }} onClick={() => setDeleteConfirm(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
