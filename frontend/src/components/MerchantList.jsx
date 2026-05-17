import MerchantCard from './MerchantCard';

export default function MerchantList({ merchants, loading, error }) {
  if (loading) return <div className="list-status">Загрузка...</div>;
  if (error)   return <div className="list-status error">{error}</div>;
  if (!merchants.length) return <div className="list-status">Нет магазинов рядом с MCC-данными</div>;

  return (
    <div className="merchant-list">
      {merchants.map((m) => (
        <MerchantCard key={m.YANDEX_FIRM_ID} merchant={m} />
      ))}
    </div>
  );
}
