import { create } from 'zustand';
import type { User } from '../types';
import * as authApi from '../api/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, isAuthenticated: false, isAdmin: false,

  login: async (email, password) => {
    const res = await authApi.login(email, password);
    localStorage.setItem('access_token', res.access_token);
    localStorage.setItem('refresh_token', res.refresh_token);
    set({ user: res.user, isAuthenticated: true, isAdmin: res.user.is_admin });
  },

  register: async (email, username, password) => {
    const res = await authApi.register(email, username, password);
    localStorage.setItem('access_token', res.access_token);
    localStorage.setItem('refresh_token', res.refresh_token);
    set({ user: res.user, isAuthenticated: true, isAdmin: res.user.is_admin });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false, isAdmin: false });
  },

  fetchUser: async () => {
    try {
      const user = await authApi.fetchMe();
      set({ user, isAuthenticated: true, isAdmin: user.is_admin });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, isAuthenticated: false, isAdmin: false });
    }
  },

  initialize: () => {
    const token = localStorage.getItem('access_token');
    if (token) set({ isAuthenticated: true });
  },
}));
