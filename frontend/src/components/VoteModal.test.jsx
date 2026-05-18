import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VoteModal from './VoteModal';

vi.mock('../api/client', () => ({
  default: { post: vi.fn() },
}));

import client from '../api/client';

const merchant = {
  YANDEX_FIRM_ID: 'firm1',
  NAME: 'Пятёрочка',
  ADDRESS: 'ул. 1',
  LAT: 55.75,
  LON: 37.61,
};

describe('VoteModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders merchant name', () => {
    render(<VoteModal merchant={merchant} onClose={vi.fn()} />);
    expect(screen.getByText('Пятёрочка')).toBeInTheDocument();
  });

  it('renders MCC options', () => {
    render(<VoteModal merchant={merchant} onClose={vi.fn()} />);
    expect(screen.getAllByText(/Продукты/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Аптека/).length).toBeGreaterThan(0);
  });

  it('vote button disabled until MCC selected', () => {
    render(<VoteModal merchant={merchant} onClose={vi.fn()} />);
    expect(screen.getByText('Проголосовать')).toBeDisabled();
  });

  it('selects MCC on click', () => {
    render(<VoteModal merchant={merchant} onClose={vi.fn()} />);
    fireEvent.click(screen.getAllByText(/Продукты/)[0]);
    expect(screen.getByText('Проголосовать')).not.toBeDisabled();
  });

  it('calls onClose when cancel clicked', () => {
    const onClose = vi.fn();
    render(<VoteModal merchant={merchant} onClose={onClose} />);
    fireEvent.click(screen.getByText('Отмена'));
    expect(onClose).toHaveBeenCalled();
  });

  it('submits vote and calls onSuccess + onClose', async () => {
    client.post.mockResolvedValue({});
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    render(<VoteModal merchant={merchant} onClose={onClose} onSuccess={onSuccess} />);

    fireEvent.click(screen.getAllByText(/Продукты/)[0]);
    fireEvent.click(screen.getByText('Проголосовать'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows error on failed vote', async () => {
    client.post.mockRejectedValue({ response: { data: { error: 'Ошибка сервера' } } });
    render(<VoteModal merchant={merchant} onClose={vi.fn()} />);

    fireEvent.click(screen.getAllByText(/Продукты/)[0]);
    fireEvent.click(screen.getByText('Проголосовать'));

    await waitFor(() => {
      expect(screen.getByText('Ошибка сервера')).toBeInTheDocument();
    });
  });

  it('closes when overlay clicked', () => {
    const onClose = vi.fn();
    render(<VoteModal merchant={merchant} onClose={onClose} />);
    fireEvent.click(document.querySelector('.modal-overlay'));
    expect(onClose).toHaveBeenCalled();
  });
});
