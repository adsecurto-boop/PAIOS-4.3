import { PAIOSStorage } from '../storage';

export interface PaiosAuthUser {
  id: string;
  email: string;
  displayName: string;
  created_at?: number;
}

export interface SyncPushResponse {
  success: boolean;
  key?: string;
  updatedAt?: number;
  syncedAt?: number;
}

export interface SyncPullResponse {
  success: boolean;
  data: Record<string, any>;
  pulledAt: number;
}

const TOKEN_KEY = 'paios_auth_token';
const USER_KEY = 'paios_auth_user';

export const AuthSyncService = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },

  getUser(): PaiosAuthUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    const token = this.getToken();
    return Boolean(token && token.trim().length > 0);
  },

  setSession(token: string, user: PaiosAuthUser): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    PAIOSStorage.setAuthToken(token);

    window.dispatchEvent(
      new CustomEvent('paios_auth_state_change', {
        detail: { isAuthenticated: true, user },
      })
    );
  },

  clearSession(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    PAIOSStorage.setAuthToken(null);

    window.dispatchEvent(
      new CustomEvent('paios_auth_state_change', {
        detail: { isAuthenticated: false, user: null },
      })
    );
  },

  async register(email: string, password: string, displayName?: string): Promise<{ token: string; user: PaiosAuthUser }> {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    this.setSession(data.token, data.user);
    return data;
  },

  async login(email: string, password: string): Promise<{ token: string; user: PaiosAuthUser }> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    this.setSession(data.token, data.user);
    return data;
  },

  async getMe(): Promise<PaiosAuthUser | null> {
    const token = this.getToken();
    if (!token) return null;

    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        this.clearSession();
      }
      return null;
    }

    const data = await response.json();
    if (data.user) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data.user;
    }
    return null;
  },

  async pushData(key: string, payload: any, version = 1): Promise<SyncPushResponse> {
    const token = this.getToken();
    if (!token) {
      throw new Error('User is not authenticated');
    }

    const response = await fetch('/api/sync/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key, payload, version }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to push data to server');
    }
    return data;
  },

  async pullAllData(): Promise<SyncPullResponse> {
    const token = this.getToken();
    if (!token) {
      throw new Error('User is not authenticated');
    }

    const response = await fetch('/api/sync/pull', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to pull data from server');
    }
    return data;
  },

  async deleteData(key?: string): Promise<{ success: boolean }> {
    const token = this.getToken();
    if (!token) {
      throw new Error('User is not authenticated');
    }

    const url = key ? `/api/sync/data?key=${encodeURIComponent(key)}` : '/api/sync/data';
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete server sync data');
    }
    return data;
  },
};

export default AuthSyncService;
