import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { usePermissions, type FeaturePermissions, type StaffRole } from '../hooks/usePermissions';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: keyof FeaturePermissions;
  permissions?: (keyof FeaturePermissions)[];
  requireAll?: boolean; // If true, all permissions must be met. If false, any one permission is enough
  minRole?: StaffRole;
  fallback?: ReactNode;
  showAccessDenied?: boolean;
  redirectTo?: string;
  onAccessDenied?: () => void;
}

/**
 * PermissionGuard Component
 *
 * Protects content based on user permissions and roles.
 *
 * Usage Examples:
 *
 * 1. Single permission check:
 * <PermissionGuard permission="editCustomers">
 *   <EditCustomerButton />
 * </PermissionGuard>
 *
 * 2. Multiple permissions (any):
 * <PermissionGuard permissions={['viewBasicReports', 'viewDetailedReports']}>
 *   <ReportsDashboard />
 * </PermissionGuard>
 *
 * 3. Multiple permissions (all required):
 * <PermissionGuard permissions={['editCustomers', 'viewSalesHistory']} requireAll>
 *   <CustomerSalesView />
 * </PermissionGuard>
 *
 * 4. Minimum role check:
 * <PermissionGuard minRole="manager">
 *   <AdminPanel />
 * </PermissionGuard>
 *
 * 5. With custom fallback:
 * <PermissionGuard permission="processRefunds" fallback={<Text>管理者に依頼してください</Text>}>
 *   <RefundButton />
 * </PermissionGuard>
 *
 * 6. With redirect:
 * <PermissionGuard permission="accessAdminPanel" redirectTo="/">
 *   <AdminPanel />
 * </PermissionGuard>
 */
export function PermissionGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  minRole,
  fallback,
  showAccessDenied = false,
  redirectTo,
  onAccessDenied,
}: PermissionGuardProps): JSX.Element | null {
  const { hasPermission, hasMinRole, role } = usePermissions();

  // Check role requirement
  if (minRole && !hasMinRole(minRole)) {
    return handleDenied();
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return handleDenied();
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    if (requireAll) {
      // All permissions must be met
      const allMet = permissions.every((p) => hasPermission(p));
      if (!allMet) {
        return handleDenied();
      }
    } else {
      // At least one permission must be met
      const anyMet = permissions.some((p) => hasPermission(p));
      if (!anyMet) {
        return handleDenied();
      }
    }
  }

  return <>{children}</>;

  function handleDenied(): JSX.Element | null {
    // Call onAccessDenied callback if provided
    if (onAccessDenied) {
      onAccessDenied();
    }

    // Redirect if specified
    if (redirectTo) {
      // Use setTimeout to avoid state update during render
      setTimeout(() => {
        router.replace(redirectTo);
      }, 0);
      return null;
    }

    // Show custom fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Show access denied message if enabled
    if (showAccessDenied) {
      return <AccessDeniedView role={role} />;
    }

    // Return null (hide content) by default
    return null;
  }
}

interface AccessDeniedViewProps {
  role: StaffRole | null;
}

function AccessDeniedView({ role }: AccessDeniedViewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>🔒</Text>
      </View>
      <Text style={styles.title}>アクセス権限がありません</Text>
      <Text style={styles.message}>
        この機能にアクセスするには、より上位の権限が必要です。
      </Text>
      {role && (
        <Text style={styles.roleInfo}>
          現在のロール: {getRoleDisplayName(role)}
        </Text>
      )}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>戻る</Text>
      </TouchableOpacity>
    </View>
  );
}

function getRoleDisplayName(role: StaffRole): string {
  const names: Record<StaffRole, string> = {
    assistant: 'アシスタント',
    staff: 'スタッフ',
    manager: 'マネージャー',
    owner: 'オーナー',
  };
  return names[role] || role;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 300,
  },
  roleInfo: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

/**
 * Higher-order component for class components or when you need to wrap an entire component
 */
export function withPermissionGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<PermissionGuardProps, 'children'>
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const GuardedComponent: React.FC<P> = (props) => {
    return (
      <PermissionGuard {...options}>
        <WrappedComponent {...props} />
      </PermissionGuard>
    );
  };

  GuardedComponent.displayName = `withPermissionGuard(${displayName})`;
  return GuardedComponent;
}

/**
 * Hook to conditionally render based on permissions
 * Returns null if permission denied, otherwise returns the children
 */
export function useGuardedContent(
  content: ReactNode,
  options: Omit<PermissionGuardProps, 'children'>
): ReactNode {
  const { hasPermission, hasMinRole } = usePermissions();

  // Check role requirement
  if (options.minRole && !hasMinRole(options.minRole)) {
    return options.fallback || null;
  }

  // Check single permission
  if (options.permission && !hasPermission(options.permission)) {
    return options.fallback || null;
  }

  // Check multiple permissions
  if (options.permissions && options.permissions.length > 0) {
    if (options.requireAll) {
      const allMet = options.permissions.every((p) => hasPermission(p));
      if (!allMet) return options.fallback || null;
    } else {
      const anyMet = options.permissions.some((p) => hasPermission(p));
      if (!anyMet) return options.fallback || null;
    }
  }

  return content;
}
