import { create } from 'zustand';
import type { Company, Store } from '../models';

interface CompanyState {
  company: Company | null;
  stores: Store[];
  currentStore: Store | null;
  isLoading: boolean;
  error: string | null;
}

interface CompanyActions {
  setCompany: (company: Company | null) => void;
  setStores: (stores: Store[]) => void;
  setCurrentStore: (store: Store | null) => void;
  addStore: (store: Store) => void;
  updateStore: (id: string, store: Partial<Store>) => void;
  removeStore: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: CompanyState = {
  company: null,
  stores: [],
  currentStore: null,
  isLoading: false,
  error: null,
};

export const useCompanyStore = create<CompanyState & CompanyActions>((set) => ({
  ...initialState,

  setCompany: (company) =>
    set({ company }),

  setStores: (stores) =>
    set({ stores }),

  setCurrentStore: (currentStore) =>
    set({ currentStore }),

  addStore: (store) =>
    set((state) => ({
      stores: [...state.stores, store],
    })),

  updateStore: (id, updates) =>
    set((state) => ({
      stores: state.stores.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
      currentStore:
        state.currentStore?.id === id
          ? { ...state.currentStore, ...updates }
          : state.currentStore,
    })),

  removeStore: (id) =>
    set((state) => ({
      stores: state.stores.filter((s) => s.id !== id),
      currentStore:
        state.currentStore?.id === id ? null : state.currentStore,
    })),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error, isLoading: false }),

  reset: () =>
    set(initialState),
}));
