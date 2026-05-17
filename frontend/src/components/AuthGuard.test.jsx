import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AuthGuard from './AuthGuard';
import * as auth from '../utils/auth';

beforeEach(() => localStorage.clear());

function renderGuard(authenticated) {
  vi.spyOn(auth, 'isAuthenticated').mockReturnValue(authenticated);
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/protected" element={<AuthGuard><div>Защищённый контент</div></AuthGuard>} />
        <Route path="/login" element={<div>Страница логина</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthGuard', () => {
  it('renders children when authenticated', () => {
    renderGuard(true);
    expect(screen.getByText('Защищённый контент')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    renderGuard(false);
    expect(screen.getByText('Страница логина')).toBeInTheDocument();
  });
});
