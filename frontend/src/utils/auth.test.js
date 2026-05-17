import { describe, it, expect, beforeEach } from 'vitest';
import { getToken, setToken, removeToken, isAuthenticated } from './auth';

beforeEach(() => localStorage.clear());

describe('auth utils', () => {
  it('getToken returns null when empty', () => {
    expect(getToken()).toBeNull();
  });

  it('setToken stores token', () => {
    setToken('abc123');
    expect(getToken()).toBe('abc123');
  });

  it('removeToken clears token', () => {
    setToken('abc123');
    removeToken();
    expect(getToken()).toBeNull();
  });

  it('isAuthenticated false when no token', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('isAuthenticated true when token set', () => {
    setToken('abc123');
    expect(isAuthenticated()).toBe(true);
  });
});
