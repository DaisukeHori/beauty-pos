import { useAuthStore } from '../authStore';
import type { Staff, Company } from '../../models';

// Reset store before each test
beforeEach(() => {
  useAuthStore.getState().reset();
});

describe('useAuthStore', () => {
  describe('initial state', () => {
    it('should initialize with null user', () => {
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('should initialize as not authenticated', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should initialize with loading true', () => {
      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it('should initialize with no error', () => {
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should set user and authenticate', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };

      useAuthStore.getState().setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should set null user and unauthenticate', () => {
      // First set a user
      useAuthStore.getState().setUser({ id: 'user-1', email: 'test@example.com' });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Then set null
      useAuthStore.getState().setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setStaff', () => {
    it('should set staff', () => {
      const mockStaff: Staff = {
        id: 'staff-1',
        companyId: 'company-1',
        userId: 'user-1',
        firstName: '太郎',
        lastName: '田中',
        email: 'tanaka@salon.com',
        role: 'stylist',
        nominationFee: 500,
        specialties: ['カット', 'カラー'],
        snsLinks: {},
        settings: {},
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useAuthStore.getState().setStaff(mockStaff);

      expect(useAuthStore.getState().staff).toEqual(mockStaff);
    });
  });

  describe('setCompany', () => {
    it('should set company', () => {
      const mockCompany: Company = {
        id: 'company-1',
        name: 'テストサロン',
        email: 'info@salon.com',
        plan: 'professional',
        subscriptionStatus: 'active',
        settings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useAuthStore.getState().setCompany(mockCompany);

      expect(useAuthStore.getState().company).toEqual(mockCompany);
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);

      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
    });
  });

  describe('setError', () => {
    it('should set error and stop loading', () => {
      useAuthStore.getState().setError('認証エラー');

      const state = useAuthStore.getState();
      expect(state.error).toBe('認証エラー');
      expect(state.isLoading).toBe(false);
    });

    it('should clear error', () => {
      useAuthStore.getState().setError('エラー');
      expect(useAuthStore.getState().error).toBe('エラー');

      useAuthStore.getState().setError(null);
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear all auth data', () => {
      const mockStaff: Staff = {
        id: 'staff-1',
        companyId: 'company-1',
        firstName: '太郎',
        lastName: '田中',
        role: 'stylist',
        nominationFee: 500,
        specialties: [],
        snsLinks: {},
        settings: {},
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockCompany: Company = {
        id: 'company-1',
        name: 'テストサロン',
        plan: 'professional',
        subscriptionStatus: 'active',
        settings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Set up authenticated state
      useAuthStore.getState().setUser({ id: 'user-1', email: 'test@example.com' });
      useAuthStore.getState().setStaff(mockStaff);
      useAuthStore.getState().setCompany(mockCompany);

      // Logout
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.staff).toBeNull();
      expect(state.company).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      // Set up some state
      useAuthStore.getState().setUser({ id: 'user-1', email: 'test@example.com' });
      useAuthStore.getState().setError('Some error');

      // Reset
      useAuthStore.getState().reset();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(true); // Initial loading state
      expect(state.error).toBeNull();
    });
  });
});
