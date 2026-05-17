import { useState } from 'react';
import client from '../api/client';
import { getToken, setToken, removeToken, isAuthenticated } from '../utils/auth';

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated);

  async function login(email, password) {
    const { data } = await client.post('/auth/login', { email, password });
    setToken(data.token);
    setAuthenticated(true);
  }

  async function register(email, password) {
    const { data } = await client.post('/auth/register', { email, password });
    setToken(data.token);
    setAuthenticated(true);
  }

  function logout() {
    removeToken();
    setAuthenticated(false);
  }

  return { authenticated, login, register, logout };
}
