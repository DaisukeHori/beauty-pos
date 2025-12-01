import { useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';

// Staff roles hierarchy (higher index = more permissions)
export type StaffRole = 'assistant' | 'staff' | 'manager' | 'owner';

const ROLE_LEVELS: Record<StaffRole, number> = {
  assistant: 0,
  staff: 1,
  manager: 2,
  owner: 3,
};

// Feature permissions by role
export interface FeaturePermissions {
  // Customer management
  viewCustomers: boolean;
  editCustomers: boolean;
  deleteCustomers: boolean;

  // Reservation management
  viewReservations: boolean;
  createReservations: boolean;
  editReservations: boolean;
  cancelReservations: boolean;

  // Sales & Checkout
  processCheckout: boolean;
  applyDiscounts: boolean;
  processRefunds: boolean;
  viewSalesHistory: boolean;

  // Inventory
  viewProducts: boolean;
  editProducts: boolean;
  adjustStock: boolean;

  // Staff management
  viewStaff: boolean;
  editStaff: boolean;
  manageShifts: boolean;
  viewAllAttendance: boolean;

  // Reports & Analytics
  viewBasicReports: boolean;
  viewDetailedReports: boolean;
  exportReports: boolean;

  // Settings & Configuration
  viewStoreSettings: boolean;
  editStoreSettings: boolean;
  manageMenus: boolean;
  manageCoupons: boolean;
  manageTickets: boolean;

  // Admin
  accessAdminPanel: boolean;
  manageCompanySettings: boolean;
  viewAuditLogs: boolean;
}

// Define permissions for each role
const ROLE_PERMISSIONS: Record<StaffRole, FeaturePermissions> = {
  assistant: {
    viewCustomers: true,
    editCustomers: false,
    deleteCustomers: false,
    viewReservations: true,
    createReservations: true,
    editReservations: false,
    cancelReservations: false,
    processCheckout: false,
    applyDiscounts: false,
    processRefunds: false,
    viewSalesHistory: false,
    viewProducts: true,
    editProducts: false,
    adjustStock: false,
    viewStaff: false,
    editStaff: false,
    manageShifts: false,
    viewAllAttendance: false,
    viewBasicReports: false,
    viewDetailedReports: false,
    exportReports: false,
    viewStoreSettings: false,
    editStoreSettings: false,
    manageMenus: false,
    manageCoupons: false,
    manageTickets: false,
    accessAdminPanel: false,
    manageCompanySettings: false,
    viewAuditLogs: false,
  },
  staff: {
    viewCustomers: true,
    editCustomers: true,
    deleteCustomers: false,
    viewReservations: true,
    createReservations: true,
    editReservations: true,
    cancelReservations: true,
    processCheckout: true,
    applyDiscounts: true,
    processRefunds: false,
    viewSalesHistory: true,
    viewProducts: true,
    editProducts: false,
    adjustStock: false,
    viewStaff: true,
    editStaff: false,
    manageShifts: false,
    viewAllAttendance: false,
    viewBasicReports: true,
    viewDetailedReports: false,
    exportReports: false,
    viewStoreSettings: true,
    editStoreSettings: false,
    manageMenus: false,
    manageCoupons: false,
    manageTickets: false,
    accessAdminPanel: false,
    manageCompanySettings: false,
    viewAuditLogs: false,
  },
  manager: {
    viewCustomers: true,
    editCustomers: true,
    deleteCustomers: true,
    viewReservations: true,
    createReservations: true,
    editReservations: true,
    cancelReservations: true,
    processCheckout: true,
    applyDiscounts: true,
    processRefunds: true,
    viewSalesHistory: true,
    viewProducts: true,
    editProducts: true,
    adjustStock: true,
    viewStaff: true,
    editStaff: true,
    manageShifts: true,
    viewAllAttendance: true,
    viewBasicReports: true,
    viewDetailedReports: true,
    exportReports: true,
    viewStoreSettings: true,
    editStoreSettings: true,
    manageMenus: true,
    manageCoupons: true,
    manageTickets: true,
    accessAdminPanel: true,
    manageCompanySettings: false,
    viewAuditLogs: true,
  },
  owner: {
    viewCustomers: true,
    editCustomers: true,
    deleteCustomers: true,
    viewReservations: true,
    createReservations: true,
    editReservations: true,
    cancelReservations: true,
    processCheckout: true,
    applyDiscounts: true,
    processRefunds: true,
    viewSalesHistory: true,
    viewProducts: true,
    editProducts: true,
    adjustStock: true,
    viewStaff: true,
    editStaff: true,
    manageShifts: true,
    viewAllAttendance: true,
    viewBasicReports: true,
    viewDetailedReports: true,
    exportReports: true,
    viewStoreSettings: true,
    editStoreSettings: true,
    manageMenus: true,
    manageCoupons: true,
    manageTickets: true,
    accessAdminPanel: true,
    manageCompanySettings: true,
    viewAuditLogs: true,
  },
};

export interface UsePermissionsReturn {
  role: StaffRole | null;
  roleLevel: number;
  permissions: FeaturePermissions;
  hasPermission: (permission: keyof FeaturePermissions) => boolean;
  hasMinRole: (minRole: StaffRole) => boolean;
  isOwner: boolean;
  isManager: boolean;
  isStaff: boolean;
  isAssistant: boolean;
}

/**
 * Hook to get current user's permissions based on their role
 */
export function usePermissions(): UsePermissionsReturn {
  const { staff } = useAuthStore();

  const role = (staff?.role as StaffRole) || null;
  const roleLevel = role ? ROLE_LEVELS[role] : -1;

  const permissions = useMemo(() => {
    if (!role) {
      // Return all false permissions for unauthenticated users
      return Object.keys(ROLE_PERMISSIONS.assistant).reduce((acc, key) => {
        acc[key as keyof FeaturePermissions] = false;
        return acc;
      }, {} as FeaturePermissions);
    }
    return ROLE_PERMISSIONS[role];
  }, [role]);

  const hasPermission = (permission: keyof FeaturePermissions): boolean => {
    return permissions[permission] || false;
  };

  const hasMinRole = (minRole: StaffRole): boolean => {
    if (!role) return false;
    return roleLevel >= ROLE_LEVELS[minRole];
  };

  return {
    role,
    roleLevel,
    permissions,
    hasPermission,
    hasMinRole,
    isOwner: role === 'owner',
    isManager: role === 'manager' || role === 'owner',
    isStaff: hasMinRole('staff'),
    isAssistant: role === 'assistant',
  };
}

/**
 * Higher-order component to protect routes/components based on permissions
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermission: keyof FeaturePermissions
): React.FC<P> {
  return function PermissionGuard(props: P) {
    const { hasPermission } = usePermissions();

    if (!hasPermission(requiredPermission)) {
      return null; // Or render an access denied component
    }

    return <WrappedComponent {...props} />;
  };
}

/**
 * Utility to check if a feature should be visible based on role
 */
export function canAccess(
  role: StaffRole | null,
  permission: keyof FeaturePermissions
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role][permission];
}

/**
 * Get list of accessible admin menu items based on role
 */
export function getAccessibleAdminMenus(role: StaffRole | null): string[] {
  if (!role) return [];

  const menus: string[] = [];
  const perms = ROLE_PERMISSIONS[role];

  if (perms.viewStoreSettings) menus.push('store');
  if (perms.manageMenus) menus.push('menus');
  if (perms.editProducts) menus.push('products');
  if (perms.editStaff) menus.push('staff');
  if (perms.manageShifts) menus.push('shifts');
  if (perms.manageCoupons) menus.push('coupons');
  if (perms.manageTickets) menus.push('tickets');
  if (perms.viewDetailedReports) menus.push('reports');

  return menus;
}
