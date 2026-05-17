import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MerchantList from './MerchantList';

const merchants = [
  { YANDEX_FIRM_ID: 'f1', NAME: 'Пятёрочка', ADDRESS: 'ул. 1', LAST_MCC: '5411', TOP_MCC_30D: '5411', VOTES_TOTAL: 3 },
  { YANDEX_FIRM_ID: 'f2', NAME: 'Магнит', ADDRESS: 'ул. 2', LAST_MCC: '5411', TOP_MCC_30D: null, VOTES_TOTAL: 1 },
];

function renderList(props) {
  return render(<MemoryRouter><MerchantList {...props} /></MemoryRouter>);
}

describe('MerchantList', () => {
  it('renders list of merchant cards', () => {
    renderList({ merchants, loading: false, error: null });
    expect(screen.getByText('Пятёрочка')).toBeInTheDocument();
    expect(screen.getByText('Магнит')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderList({ merchants: [], loading: true, error: null });
    expect(screen.getByText('Загрузка...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    renderList({ merchants: [], loading: false, error: 'Сервер недоступен' });
    expect(screen.getByText('Сервер недоступен')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    renderList({ merchants: [], loading: false, error: null });
    expect(screen.getByText(/Нет магазинов/)).toBeInTheDocument();
  });
});
