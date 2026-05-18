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

  it('renders MCC code input', () => {
    render(<VoteModal merchant={merchant} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText(/5411/)).toBeInTheDocument();
  });

  it('vote button disabled until 4-digit code entered', () => {
    render(<VoteModal merchant={merchant} onClose={vi.fn()} />);
    expect(screen.getByText('Проголосовать')).toBeDisabled();
  });

  it('enables vote button after entering 4 digits', () => {
    render(<VoteModal merchant={merchant} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/5411/), { target: { value: '5411' } });
    expect(screen.getByText('Проголосовать')).not.toBeDisabled();
  });

  it('keeps vote button disabled with fewer than 4 digits', () => {
    render(<VoteModal merchant={merchant} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/5411/), { target: { value: '541' } });
    expect(screen.getByText('Проголосовать')).toBeDisabled();
  });

  it('strips non-digit characters from input', () => {
    render(<VoteModal merchant={merchant} onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText(/5411/);
    fireEvent.change(input, { target: { value: 'ab54cd11' } });
    expect(input.value).toBe('5411');
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

    fireEvent.change(screen.getByPlaceholderText(/5411/), { target: { value: '5411' } });
    fireEvent.click(screen.getByText('Проголосовать'));

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/votes', expect.objectContaining({ mcc_code: '5411' }));
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows error on failed vote', async () => {
    client.post.mockRejectedValue({ response: { data: { error: 'Ошибка сервера' } } });
    render(<VoteModal merchant={merchant} onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/5411/), { target: { value: '5412' } });
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

  it('shows bank coverage for known MCC', () => {
    render(<VoteModal merchant={merchant} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/5411/), { target: { value: '5411' } });
    // 5411 (supermarkets) should appear in at least one bank's coverage
    expect(document.querySelector('.mcc-coverage')).not.toBeNull();
  });
});
