import { Link } from 'react-router-dom';
import { mccLabel } from '../utils/mcc';

function GisRating({ rating, reviewCount }) {
  if (!rating) return null;
  return (
    <span className="gis-rating">
      <span className="gis-star">★</span>
      {rating.toFixed(1)}
      {reviewCount > 0 && <span className="gis-reviews"> ({reviewCount} отз.)</span>}
    </span>
  );
}

export default function MerchantCard({ merchant }) {
  const { YANDEX_FIRM_ID, NAME, ADDRESS, LAST_MCC, TOP_MCC_30D, VOTES_TOTAL, GIS_RATING, GIS_REVIEW_COUNT, NO_TERMINAL_COUNT } = merchant;
  return (
    <Link to={`/merchant/${YANDEX_FIRM_ID}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="merchant-card">
        <div className="merchant-card-header">
          <strong>{NAME || 'Без названия'}</strong>
          <GisRating rating={GIS_RATING} reviewCount={GIS_REVIEW_COUNT} />
        </div>
        <span className="address">{ADDRESS}</span>
        <div className="mcc-badges">
          {LAST_MCC && <span className="badge badge-last">Последний: {mccLabel(LAST_MCC)}</span>}
          {TOP_MCC_30D && <span className="badge badge-top">Топ 30д: {mccLabel(TOP_MCC_30D)}</span>}
          {VOTES_TOTAL > 0 && <span className="votes">{VOTES_TOTAL} голос(ов)</span>}
          {NO_TERMINAL_COUNT > 0 && <span className="badge badge-no-terminal">💳 Нет терминала</span>}
        </div>
      </div>
    </Link>
  );
}
