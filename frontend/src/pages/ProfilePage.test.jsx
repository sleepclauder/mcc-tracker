import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from './ProfilePage';

vi.mock('../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ userEmail: 'test@example.com', logout: vi.fn() }),
}));
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => vi.fn(),
}));

import client from '../api/client';

const CARD = { id: 1, bank_name: 'Т-Банк', card_name: 'Черная' };
const RULE = { id: 10, category_name: 'Супермаркеты', cashback_pct: 5 };

function renderPage() {
  return render(<MemoryRouter><ProfilePage /></MemoryRouter>);
}

describe('ProfilePage — saveRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.get.mockImplementation((url) => {
      if (url === '/cards') return Promise.resolve({ data: [CARD] });
      if (url.includes('/rules')) return Promise.resolve({ data: [RULE] });
      return Promise.resolve({ data: [] });
    });
  });

  it('save button appears after modifying a rule', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Т-Банк'));

    // change cashback percent
    const input = await screen.findByDisplayValue('5');
    fireEvent.change(input, { target: { value: '10' } });

    expect(screen.getByText('Сохранить')).toBeInTheDocument();
  });

  it('save button disappears after successful save', async () => {
    client.put.mockResolvedValue({ data: { ok: true } });
    renderPage();
    await waitFor(() => screen.getByText('Т-Банк'));

    const input = await screen.findByDisplayValue('5');
    fireEvent.change(input, { target: { value: '10' } });

    fireEvent.click(screen.getByText('Сохранить'));

    await waitFor(() => expect(screen.queryByText('Сохранить')).not.toBeInTheDocument());
    expect(client.put).toHaveBeenCalledWith(
      '/cards/1/rules',
      expect.objectContaining({ rules: [{ category_name: 'Супермаркеты', cashback_pct: 10 }] })
    );
  });

  it('shows error message when save fails with server error', async () => {
    client.put.mockRejectedValue({ response: { data: { error: 'cashback_pct must be 0 < n <= 100' } } });
    renderPage();
    await waitFor(() => screen.getByText('Т-Банк'));

    const input = await screen.findByDisplayValue('5');
    fireEvent.change(input, { target: { value: '200' } });

    fireEvent.click(screen.getByText('Сохранить'));

    await waitFor(() =>
      expect(screen.getByText('cashback_pct must be 0 < n <= 100')).toBeInTheDocument()
    );
    // save button stays visible so user can retry
    expect(screen.getByText('Сохранить')).toBeInTheDocument();
  });

  it('shows generic error when server returns no message', async () => {
    client.put.mockRejectedValue(new Error('Network Error'));
    renderPage();
    await waitFor(() => screen.getByText('Т-Банк'));

    const input = await screen.findByDisplayValue('5');
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.click(screen.getByText('Сохранить'));

    await waitFor(() =>
      expect(screen.getByText('Ошибка сохранения')).toBeInTheDocument()
    );
  });

  it('clears error on next successful save', async () => {
    client.put
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({ data: { ok: true } });
    renderPage();
    await waitFor(() => screen.getByText('Т-Банк'));

    const input = await screen.findByDisplayValue('5');
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.click(screen.getByText('Сохранить'));

    await waitFor(() => screen.getByText('Ошибка сохранения'));

    fireEvent.click(screen.getByText('Сохранить'));

    await waitFor(() => {
      expect(screen.queryByText('Ошибка сохранения')).not.toBeInTheDocument();
      expect(screen.queryByText('Сохранить')).not.toBeInTheDocument();
    });
  });
});
