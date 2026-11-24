import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setAuthToken, setUnauthorizedHandler } from '../api/client';
import { AuthUser, loginUser, registerUser } from '../api/stocksense';

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  sessionNotice: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  clearSessionNotice: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_TOKEN_KEY = 'stocksense_jwt_token';
const SESSION_USER_KEY = 'stocksense_auth_user';

function readStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

function readStoredUser(): AuthUser | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(token: string | null, user: AuthUser | null): void {
  try {
    if (token) {
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      if (user) {
        window.sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
      } else {
        window.sessionStorage.removeItem(SESSION_USER_KEY);
      }
    } else {
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
      window.sessionStorage.removeItem(SESSION_USER_KEY);
    }
  } catch {
    // Ignore storage quota or sandbox errors
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const stored = readStoredToken();
    setAuthToken(stored);
    return stored;
  });
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const logout = useCallback(() => {
    writeStoredSession(null, null);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      writeStoredSession(null, null);
      setAuthToken(null);
      setToken(null);
      setUser(null);
      setSessionNotice('Your session expired or the token was rejected (401). Please sign in again.');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setSessionNotice(null);
    const result = await loginUser({ email, password });
    writeStoredSession(result.token, result.user);
    setAuthToken(result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setSessionNotice(null);
    const result = await registerUser({
      name: name.trim() || undefined,
      email,
      password,
    });
    writeStoredSession(result.token, result.user);
    setAuthToken(result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const clearSessionNotice = useCallback(() => {
    setSessionNotice(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: Boolean(token),
        sessionNotice,
        login,
        register,
        logout,
        clearSessionNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
