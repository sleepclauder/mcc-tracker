const KEY = 'mcc_token';

export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t) => localStorage.setItem(KEY, t);
export const removeToken = () => localStorage.removeItem(KEY);
export const isAuthenticated = () => Boolean(getToken());

function decodePayload() {
  const token = getToken();
  if (!token) return null;
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

export function getCurrentUserEmail() {
  return decodePayload()?.email ?? null;
}

export function getCurrentUserIsAdmin() {
  return decodePayload()?.is_admin === true;
}
