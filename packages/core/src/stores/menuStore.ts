import { create } from 'zustand';
import type { MenuCategory, Menu, Process, MenuProcess } from '../models';

interface MenuState {
  categories: MenuCategory[];
  menus: Menu[];
  processes: Process[];
  selectedCategory: MenuCategory | null;
  selectedMenu: Menu | null;
  isLoading: boolean;
  error: string | null;
}

interface MenuActions {
  setCategories: (categories: MenuCategory[]) => void;
  setMenus: (menus: Menu[]) => void;
  setProcesses: (processes: Process[]) => void;
  setSelectedCategory: (category: MenuCategory | null) => void;
  setSelectedMenu: (menu: Menu | null) => void;
  addCategory: (category: MenuCategory) => void;
  updateCategory: (id: string, updates: Partial<MenuCategory>) => void;
  removeCategory: (id: string) => void;
  addMenu: (menu: Menu) => void;
  updateMenu: (id: string, updates: Partial<Menu>) => void;
  removeMenu: (id: string) => void;
  addProcess: (process: Process) => void;
  updateProcess: (id: string, updates: Partial<Process>) => void;
  removeProcess: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: MenuState = {
  categories: [],
  menus: [],
  processes: [],
  selectedCategory: null,
  selectedMenu: null,
  isLoading: false,
  error: null,
};

export const useMenuStore = create<MenuState & MenuActions>((set) => ({
  ...initialState,

  setCategories: (categories) =>
    set({ categories }),

  setMenus: (menus) =>
    set({ menus }),

  setProcesses: (processes) =>
    set({ processes }),

  setSelectedCategory: (selectedCategory) =>
    set({ selectedCategory }),

  setSelectedMenu: (selectedMenu) =>
    set({ selectedMenu }),

  addCategory: (category) =>
    set((state) => ({
      categories: [...state.categories, category],
    })),

  updateCategory: (id, updates) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
      selectedCategory:
        state.selectedCategory?.id === id
          ? { ...state.selectedCategory, ...updates }
          : state.selectedCategory,
    })),

  removeCategory: (id) =>
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
      selectedCategory:
        state.selectedCategory?.id === id ? null : state.selectedCategory,
    })),

  addMenu: (menu) =>
    set((state) => ({
      menus: [...state.menus, menu],
    })),

  updateMenu: (id, updates) =>
    set((state) => ({
      menus: state.menus.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
      selectedMenu:
        state.selectedMenu?.id === id
          ? { ...state.selectedMenu, ...updates }
          : state.selectedMenu,
    })),

  removeMenu: (id) =>
    set((state) => ({
      menus: state.menus.filter((m) => m.id !== id),
      selectedMenu:
        state.selectedMenu?.id === id ? null : state.selectedMenu,
    })),

  addProcess: (process) =>
    set((state) => ({
      processes: [...state.processes, process],
    })),

  updateProcess: (id, updates) =>
    set((state) => ({
      processes: state.processes.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  removeProcess: (id) =>
    set((state) => ({
      processes: state.processes.filter((p) => p.id !== id),
    })),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error, isLoading: false }),

  reset: () =>
    set(initialState),
}));
