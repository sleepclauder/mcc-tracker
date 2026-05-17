import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MerchantCard from './MerchantCard';

const merchant = {
  YANDEX_FIRM_ID: 'firm1',
  NAME: 'Пятёрочка',
  ADDRESS: 'ул. Ленина 1',
  LAST_MCC: '5411',
  TOP_MCC_30D: '5411',
  VOTES_TOTAL: 5,
  GIS_RATING: null,
  GIS_REVIEW_COUNT: 0,
};

function renderCard(m = merchant) {
  return render(<MemoryRouter><MerchantCard merchant={m} /></MemoryRouter>);
}

describe('MerchantCard', () => {
  it('renders merchant name', () => {
    renderCard();
    expect(screen.getByText('Пятёрочка')).toBeInTheDocument();
  });

  it('renders address', () => {
    renderCard();
    expect(screen.getByText('ул. Ленина 1')).toBeInTheDocument();
  });

  it('renders last MCC badge', () => {
    renderCard();
    expect(screen.getAllByText(/5411/).length).toBeGreaterThan(0);
  });

  it('renders votes count', () => {
    renderCard();
    expect(screen.getByText(/5 голос/)).toBeInTheDocument();
  });

  it('links to merchant page', () => {
    renderCard();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/merchant/firm1');
  });

  it('shows fallback name when NAME is null', () => {
    renderCard({ ...merchant, NAME: null });
    expect(screen.getByText('Без названия')).toBeInTheDocument();
  });

  it('does not render MCC badges when null', () => {
    renderCard({ ...merchant, LAST_MCC: null, TOP_MCC_30D: null, VOTES_TOTAL: 0 });
    expect(screen.queryByText(/Последний/)).not.toBeInTheDocument();
  });

  it('shows gis rating when available', () => {
    renderCard({ ...merchant, GIS_RATING: 4.5, GIS_REVIEW_COUNT: 123 });
    expect(screen.getByText(/4\.5/)).toBeInTheDocument();
    expect(screen.getByText(/123 отз\./)).toBeInTheDocument();
  });

  it('does not show gis rating when null', () => {
    renderCard({ ...merchant, GIS_RATING: null });
    expect(screen.queryByText(/отз\./)).not.toBeInTheDocument();
  });
});
