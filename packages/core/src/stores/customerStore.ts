import { create } from 'zustand';
import type { Customer, CustomerKarte, CustomerPhoto, ColorRecipe, PermRecipe } from '../models';

interface CustomerFilters {
  search?: string;
  status?: string;
  tagIds?: string[];
}

interface CustomerState {
  customers: Customer[];
  selectedCustomer: Customer | null;
  karte: CustomerKarte | null;
  photos: CustomerPhoto[];
  colorRecipes: ColorRecipe[];
  permRecipes: PermRecipe[];
  filters: CustomerFilters;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CustomerActions {
  setCustomers: (customers: Customer[]) => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  setKarte: (karte: CustomerKarte | null) => void;
  setPhotos: (photos: CustomerPhoto[]) => void;
  setColorRecipes: (recipes: ColorRecipe[]) => void;
  setPermRecipes: (recipes: PermRecipe[]) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  removeCustomer: (id: string) => void;
  setFilters: (filters: CustomerFilters) => void;
  setPagination: (pagination: Partial<CustomerState['pagination']>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: CustomerState = {
  customers: [],
  selectedCustomer: null,
  karte: null,
  photos: [],
  colorRecipes: [],
  permRecipes: [],
  filters: {},
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
};

export const useCustomerStore = create<CustomerState & CustomerActions>((set) => ({
  ...initialState,

  setCustomers: (customers) =>
    set({ customers }),

  setSelectedCustomer: (selectedCustomer) =>
    set({ selectedCustomer }),

  setKarte: (karte) =>
    set({ karte }),

  setPhotos: (photos) =>
    set({ photos }),

  setColorRecipes: (colorRecipes) =>
    set({ colorRecipes }),

  setPermRecipes: (permRecipes) =>
    set({ permRecipes }),

  addCustomer: (customer) =>
    set((state) => ({
      customers: [customer, ...state.customers],
      pagination: {
        ...state.pagination,
        total: state.pagination.total + 1,
      },
    })),

  updateCustomer: (id, updates) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
      selectedCustomer:
        state.selectedCustomer?.id === id
          ? { ...state.selectedCustomer, ...updates }
          : state.selectedCustomer,
    })),

  removeCustomer: (id) =>
    set((state) => ({
      customers: state.customers.filter((c) => c.id !== id),
      selectedCustomer:
        state.selectedCustomer?.id === id ? null : state.selectedCustomer,
      pagination: {
        ...state.pagination,
        total: state.pagination.total - 1,
      },
    })),

  setFilters: (filters) =>
    set({ filters }),

  setPagination: (pagination) =>
    set((state) => ({
      pagination: { ...state.pagination, ...pagination },
    })),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error, isLoading: false }),

  reset: () =>
    set(initialState),
}));
