import { Link } from 'react-router-dom';

export default function MerchantCard({ merchant }) {
  const { YANDEX_FIRM_ID, NAME, ADDRESS, LAST_MCC, TOP_MCC_30D, VOTES_TOTAL } = merchant;
  return (
    <Link to={`/merchant/${YANDEX_FIRM_ID}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="merchant-card">
        <strong>{NAME || 'Без названия'}</strong>
        <span className="address">{ADDRESS}</span>
        <div className="mcc-badges">
          {LAST_MCC && <span className="badge badge-last">Последний: {LAST_MCC}</span>}
          {TOP_MCC_30D && <span className="badge badge-top">Топ 30д: {TOP_MCC_30D}</span>}
          {VOTES_TOTAL > 0 && <span className="votes">{VOTES_TOTAL} голос(ов)</span>}
        </div>
      </div>
    </Link>
  );
}
