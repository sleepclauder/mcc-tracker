import { useState } from 'react';
import client from '../api/client';
import { setToken, removeToken, isAuthenticated, getCurrentUserEmail } from '../utils/auth';

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated);
  const [userEmail, setUserEmail] = useState(getCurrentUserEmail);

  async function login(email, password) {
    const { data } = await client.post('/auth/login', { email, password });
    setToken(data.token);
    setAuthenticated(true);
    setUserEmail(getCurrentUserEmail());
  }

  async function register(email, password) {
    const { data } = await client.post('/auth/register', { email, password });
    setToken(data.token);
    setAuthenticated(true);
    setUserEmail(getCurrentUserEmail());
  }

  function logout() {
    removeToken();
    setAuthenticated(false);
    setUserEmail(null);
  }

  return { authenticated, userEmail, login, register, logout };
}
