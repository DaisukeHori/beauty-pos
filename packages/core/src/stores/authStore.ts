import { create } from 'zustand';
import type { Company, Staff } from '../models';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  staff: Staff | null;
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setStaff: (staff: Staff | null) => void;
  setCompany: (company: Company | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  reset: () => void;
}

const initialState: AuthState = {
  user: null,
  staff: null,
  company: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  ...initialState,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  setStaff: (staff) =>
    set({ staff }),

  setCompany: (company) =>
    set({ company }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error, isLoading: false }),

  logout: () =>
    set({
      ...initialState,
      isLoading: false,
    }),

  reset: () =>
    set(initialState),
}));
