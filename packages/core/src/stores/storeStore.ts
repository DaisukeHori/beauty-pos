import { create } from 'zustand';
import type { Store } from '../models';

interface StoreState {
  stores: Store[];
  selectedStore: Store | null;
  isLoading: boolean;
  error: string | null;
}

interface StoreActions {
  setStores: (stores: Store[]) => void;
  setSelectedStore: (store: Store | null) => void;
  addStore: (store: Store) => void;
  updateStore: (id: string, updates: Partial<Store>) => void;
  removeStore: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: StoreState = {
  stores: [],
  selectedStore: null,
  isLoading: false,
  error: null,
};

export const useStoreStore = create<StoreState & StoreActions>((set) => ({
  ...initialState,

  setStores: (stores) =>
    set({ stores }),

  setSelectedStore: (selectedStore) =>
    set({ selectedStore }),

  addStore: (store) =>
    set((state) => ({
      stores: [...state.stores, store],
    })),

  updateStore: (id, updates) =>
    set((state) => ({
      stores: state.stores.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
      selectedStore:
        state.selectedStore?.id === id
          ? { ...state.selectedStore, ...updates }
          : state.selectedStore,
    })),

  removeStore: (id) =>
    set((state) => ({
      stores: state.stores.filter((s) => s.id !== id),
      selectedStore:
        state.selectedStore?.id === id ? null : state.selectedStore,
    })),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error, isLoading: false }),

  reset: () =>
    set(initialState),
}));
