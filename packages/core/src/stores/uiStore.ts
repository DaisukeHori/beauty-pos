import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface Modal {
  id: string;
  component: string;
  props?: Record<string, unknown>;
}

interface UIState {
  theme: Theme;
  isOnline: boolean;
  isSidebarOpen: boolean;
  toasts: Toast[];
  modals: Modal[];
  isKeyboardVisible: boolean;
  keyboardHeight: number;
}

interface UIActions {
  setTheme: (theme: Theme) => void;
  setOnline: (isOnline: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;
  openModal: (id: string, component: string, props?: Record<string, unknown>) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  setKeyboardVisible: (visible: boolean, height?: number) => void;
  reset: () => void;
}

const initialState: UIState = {
  theme: 'system',
  isOnline: true,
  isSidebarOpen: false,
  toasts: [],
  modals: [],
  isKeyboardVisible: false,
  keyboardHeight: 0,
};

let toastIdCounter = 0;

export const useUIStore = create<UIState & UIActions>((set) => ({
  ...initialState,

  setTheme: (theme) =>
    set({ theme }),

  setOnline: (isOnline) =>
    set({ isOnline }),

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setSidebarOpen: (isSidebarOpen) =>
    set({ isSidebarOpen }),

  showToast: (message, type = 'info', duration = 3000) => {
    const id = `toast-${++toastIdCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  hideToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearToasts: () =>
    set({ toasts: [] }),

  openModal: (id, component, props) =>
    set((state) => ({
      modals: [...state.modals, { id, component, props }],
    })),

  closeModal: (id) =>
    set((state) => ({
      modals: state.modals.filter((m) => m.id !== id),
    })),

  closeAllModals: () =>
    set({ modals: [] }),

  setKeyboardVisible: (isKeyboardVisible, keyboardHeight = 0) =>
    set({ isKeyboardVisible, keyboardHeight }),

  reset: () =>
    set(initialState),
}));
