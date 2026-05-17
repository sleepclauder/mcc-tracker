import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ login: mockLogin, register: mockRegister }),
}));

const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => mockNavigate,
}));

function renderPage() {
  return render(<MemoryRouter><LoginPage /></MemoryRouter>);
}

describe('LoginPage', () => {
  beforeEach(() => { vi.clearAllMocks(); mockLogin.mockResolvedValue(undefined); mockRegister.mockResolvedValue(undefined); });

  it('renders login form by default', () => {
    renderPage();
    expect(screen.getByText('Вход')).toBeInTheDocument();
  });

  it('switches to register mode', () => {
    renderPage();
    fireEvent.click(screen.getByText(/Зарегистрироваться/));
    expect(screen.getByText('Регистрация')).toBeInTheDocument();
  });

  it('shows error when fields empty', async () => {
    renderPage();
    fireEvent.submit(screen.getByRole('button', { name: 'Войти' }).closest('form'));
    await waitFor(() => expect(screen.getByText('Заполните все поля')).toBeInTheDocument());
  });

  it('calls login with email and password', async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Пароль/), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('a@b.com', 'password123'));
  });

  it('navigates to / on success', async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Пароль/), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('shows API error on failed login', async () => {
    mockLogin.mockRejectedValue({ response: { data: { error: 'invalid credentials' } } });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Пароль/), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
    await waitFor(() => expect(screen.getByText('invalid credentials')).toBeInTheDocument());
  });
});
