import { useUIStore } from '../uiStore';
import { act } from '@testing-library/react';

// Reset store before each test
beforeEach(() => {
  act(() => {
    useUIStore.getState().reset();
  });
});

describe('useUIStore', () => {
  describe('theme', () => {
    it('should initialize with system theme', () => {
      expect(useUIStore.getState().theme).toBe('system');
    });

    it('should set theme', () => {
      act(() => {
        useUIStore.getState().setTheme('dark');
      });
      expect(useUIStore.getState().theme).toBe('dark');
    });
  });

  describe('online status', () => {
    it('should initialize as online', () => {
      expect(useUIStore.getState().isOnline).toBe(true);
    });

    it('should set online status', () => {
      act(() => {
        useUIStore.getState().setOnline(false);
      });
      expect(useUIStore.getState().isOnline).toBe(false);
    });
  });

  describe('sidebar', () => {
    it('should initialize with sidebar closed', () => {
      expect(useUIStore.getState().isSidebarOpen).toBe(false);
    });

    it('should toggle sidebar', () => {
      act(() => {
        useUIStore.getState().toggleSidebar();
      });
      expect(useUIStore.getState().isSidebarOpen).toBe(true);

      act(() => {
        useUIStore.getState().toggleSidebar();
      });
      expect(useUIStore.getState().isSidebarOpen).toBe(false);
    });

    it('should set sidebar open state', () => {
      act(() => {
        useUIStore.getState().setSidebarOpen(true);
      });
      expect(useUIStore.getState().isSidebarOpen).toBe(true);
    });
  });

  describe('toasts', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should initialize with no toasts', () => {
      expect(useUIStore.getState().toasts).toHaveLength(0);
    });

    it('should show toast', () => {
      act(() => {
        useUIStore.getState().showToast('Test message', 'success');
      });
      const toasts = useUIStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Test message');
      expect(toasts[0].type).toBe('success');
    });

    it('should auto-hide toast after duration', () => {
      act(() => {
        useUIStore.getState().showToast('Test message', 'info', 1000);
      });
      expect(useUIStore.getState().toasts).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(useUIStore.getState().toasts).toHaveLength(0);
    });

    it('should hide specific toast', () => {
      act(() => {
        useUIStore.getState().showToast('Toast 1', 'info', 0); // duration 0 = no auto-hide
        useUIStore.getState().showToast('Toast 2', 'info', 0);
      });
      expect(useUIStore.getState().toasts).toHaveLength(2);

      const toastId = useUIStore.getState().toasts[0].id;
      act(() => {
        useUIStore.getState().hideToast(toastId);
      });
      expect(useUIStore.getState().toasts).toHaveLength(1);
      expect(useUIStore.getState().toasts[0].message).toBe('Toast 2');
    });

    it('should clear all toasts', () => {
      act(() => {
        useUIStore.getState().showToast('Toast 1', 'info', 0);
        useUIStore.getState().showToast('Toast 2', 'info', 0);
      });
      expect(useUIStore.getState().toasts).toHaveLength(2);

      act(() => {
        useUIStore.getState().clearToasts();
      });
      expect(useUIStore.getState().toasts).toHaveLength(0);
    });
  });

  describe('modals', () => {
    it('should initialize with no modals', () => {
      expect(useUIStore.getState().modals).toHaveLength(0);
    });

    it('should open modal', () => {
      act(() => {
        useUIStore.getState().openModal('modal-1', 'ConfirmDialog', { title: 'Test' });
      });
      const modals = useUIStore.getState().modals;
      expect(modals).toHaveLength(1);
      expect(modals[0].id).toBe('modal-1');
      expect(modals[0].component).toBe('ConfirmDialog');
      expect(modals[0].props).toEqual({ title: 'Test' });
    });

    it('should close specific modal', () => {
      act(() => {
        useUIStore.getState().openModal('modal-1', 'Dialog1');
        useUIStore.getState().openModal('modal-2', 'Dialog2');
      });
      expect(useUIStore.getState().modals).toHaveLength(2);

      act(() => {
        useUIStore.getState().closeModal('modal-1');
      });
      expect(useUIStore.getState().modals).toHaveLength(1);
      expect(useUIStore.getState().modals[0].id).toBe('modal-2');
    });

    it('should close all modals', () => {
      act(() => {
        useUIStore.getState().openModal('modal-1', 'Dialog1');
        useUIStore.getState().openModal('modal-2', 'Dialog2');
      });

      act(() => {
        useUIStore.getState().closeAllModals();
      });
      expect(useUIStore.getState().modals).toHaveLength(0);
    });
  });

  describe('keyboard', () => {
    it('should initialize keyboard state', () => {
      expect(useUIStore.getState().isKeyboardVisible).toBe(false);
      expect(useUIStore.getState().keyboardHeight).toBe(0);
    });

    it('should set keyboard visibility', () => {
      act(() => {
        useUIStore.getState().setKeyboardVisible(true, 300);
      });
      expect(useUIStore.getState().isKeyboardVisible).toBe(true);
      expect(useUIStore.getState().keyboardHeight).toBe(300);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      act(() => {
        useUIStore.getState().setTheme('dark');
        useUIStore.getState().setOnline(false);
        useUIStore.getState().setSidebarOpen(true);
        useUIStore.getState().showToast('Test', 'info', 0);
        useUIStore.getState().openModal('modal-1', 'Dialog');
      });

      act(() => {
        useUIStore.getState().reset();
      });

      const state = useUIStore.getState();
      expect(state.theme).toBe('system');
      expect(state.isOnline).toBe(true);
      expect(state.isSidebarOpen).toBe(false);
      expect(state.toasts).toHaveLength(0);
      expect(state.modals).toHaveLength(0);
    });
  });
});
