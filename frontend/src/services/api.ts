const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, '');

export interface AuthenticatedUser {
  idUsuario: number;
  nombre: string;
  usuario: string;
  rol: string;
}

interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  usuario: AuthenticatedUser;
}

const TOKEN_STORAGE_KEY = 'electromarket.access-token';
const USER_STORAGE_KEY = 'electromarket.authenticated-user';
let accessToken = sessionStorage.getItem(TOKEN_STORAGE_KEY) || '';
let authenticatedUser: AuthenticatedUser | null = null;

try {
  const storedUser = sessionStorage.getItem(USER_STORAGE_KEY);
  authenticatedUser = storedUser ? JSON.parse(storedUser) as AuthenticatedUser : null;
} catch {
  sessionStorage.removeItem(USER_STORAGE_KEY);
}

export const getAccessToken = () => accessToken;
export const getAuthenticatedUser = () => authenticatedUser;

export const saveAuthSession = (session: LoginResponse) => {
  accessToken = session.accessToken;
  authenticatedUser = session.usuario;
  sessionStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
  sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authenticatedUser));
};

export const updateAuthenticatedUser = (user: AuthenticatedUser) => {
  authenticatedUser = user;
  sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

export const clearAuthSession = () => {
  accessToken = '';
  authenticatedUser = null;
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(USER_STORAGE_KEY);
};

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  const headers = new Headers(init.headers);
  if (hasBody && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (accessToken && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const raw = await response.text();
  let payload: any = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      clearAuthSession();
      window.dispatchEvent(new Event('electromarket:authentication-expired'));
    }
    const message = typeof payload === 'string'
      ? payload
      : payload?.mensaje || payload?.message || payload?.error || `La API respondió ${response.status}.`;
    throw new Error(message);
  }

  return payload as T;
}

export const get = <T,>(path: string) => apiRequest<T>(path);

export const post = <T,>(path: string, body: unknown) =>
  apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const put = <T,>(path: string, body: unknown) =>
  apiRequest<T>(path, { method: 'PUT', body: JSON.stringify(body) });

export const patch = <T,>(path: string, body: unknown) =>
  apiRequest<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
