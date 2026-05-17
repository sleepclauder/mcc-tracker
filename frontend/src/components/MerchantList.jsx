import MerchantCard from './MerchantCard';
import { MapPin } from './Icons';

export default function MerchantList({ merchants, loading, error }) {
  if (loading) return <div className="list-status">Загрузка...</div>;
  if (error)   return <div className="list-status error">{error}</div>;
  if (!merchants.length) return (
    <div className="list-empty">
      <MapPin size={32} style={{ color: '#ccc' }} />
      <p>Нет магазинов в радиусе 1 км</p>
      <p className="list-empty-hint">Передвиньте карту в нужный район</p>
    </div>
  );

  return (
    <div className="merchant-list">
      {merchants.map((m) => (
        <MerchantCard key={m.YANDEX_FIRM_ID} merchant={m} />
      ))}
    </div>
  );
}
