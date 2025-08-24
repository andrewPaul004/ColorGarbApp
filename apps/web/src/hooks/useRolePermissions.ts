import { useMemo } from 'react';
import { UserRole, RoleUtils } from '../../../../packages/shared/src/types/user';
import { useAppStore } from '../stores/appStore';

/**
 * Permission check result interface
 * @interface PermissionResult
 */
interface PermissionResult {
  /** Whether the user has the required permission */
  hasPermission: boolean;
  /** Reason why permission was denied (if applicable) */
  reason?: string;
}

/**
 * Role permissions hook that provides role-based access control utilities.
 * Simplifies permission checking throughout the application.
 * 
 * @returns Object containing permission check functions and user role info
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { userRole, isDirector, isColorGarbStaff, canAccess, canAccessOrganization } = useRolePermissions();
 *   
 *   if (isColorGarbStaff) {
 *     return <AdminPanel />;
 *   }
 *   
 *   if (canAccess(UserRole.Director)) {
 *     return <DirectorDashboard />;
 *   }
 *   
 *   return <FinanceView />;
 * }
 * ```
 * 
 * @since 1.0.0
 */
export const useRolePermissions = () => {
  const { user, isAuthenticated } = useAppStore();

  const roleInfo = useMemo(() => {
    if (!isAuthenticated || !user) {
      return null;
    }

    const userRole = user.role as UserRole;
    return {
      userRole,
      roleInfo: RoleUtils.getRoleInfo(userRole),
      isOrganizationScoped: RoleUtils.isOrganizationScoped(userRole),
      hasCrossOrganizationAccess: RoleUtils.hasCrossOrganizationAccess(userRole)
    };
  }, [user, isAuthenticated]);

  /**
   * Checks if the current user has a specific role
   * @param role - Role to check against
   * @returns True if user has the specified role
   */
  const hasRole = (role: UserRole): boolean => {
    if (!roleInfo) return false;
    return roleInfo.userRole === role;
  };

  /**
   * Checks if the current user can access resources that require a specific role
   * @param requiredRole - Required role for access
   * @returns Permission check result
   */
  const canAccess = (requiredRole: UserRole): PermissionResult => {
    if (!roleInfo) {
      return { hasPermission: false, reason: 'User not authenticated' };
    }

    const hasPermission = RoleUtils.hasPermission(
      roleInfo.userRole,
      user?.organizationId,
      requiredRole
    );

    if (!hasPermission) {
      return {
        hasPermission: false,
        reason: `Required role: ${RoleUtils.getRoleInfo(requiredRole).name}, User role: ${roleInfo.roleInfo.name}`
      };
    }

    return { hasPermission: true };
  };

  /**
   * Checks if the current user can access organization-specific resources
   * @param targetOrganizationId - Organization ID to check access for
   * @param requiredRole - Required role for access (optional)
   * @returns Permission check result
   */
  const canAccessOrganization = (
    targetOrganizationId: string,
    requiredRole?: UserRole
  ): PermissionResult => {
    if (!roleInfo) {
      return { hasPermission: false, reason: 'User not authenticated' };
    }

    // ColorGarb staff can access any organization
    if (roleInfo.hasCrossOrganizationAccess) {
      return { hasPermission: true };
    }

    // Check if user belongs to the target organization
    if (user?.organizationId !== targetOrganizationId) {
      return {
        hasPermission: false,
        reason: 'User does not belong to the target organization'
      };
    }

    // If a specific role is required, check it
    if (requiredRole) {
      return canAccess(requiredRole);
    }

    return { hasPermission: true };
  };

  /**
   * Checks if the current user can perform a specific action
   * @param action - Action to check (e.g., 'create_order', 'manage_users')
   * @param organizationId - Organization context (optional)
   * @returns Permission check result
   */
  const canPerformAction = (
    action: string,
    organizationId?: string
  ): PermissionResult => {
    if (!roleInfo) {
      return { hasPermission: false, reason: 'User not authenticated' };
    }

    // Define action-to-role mappings
    const actionRoleMap: Record<string, UserRole[]> = {
      // Director actions
      'manage_organization': [UserRole.Director],
      'manage_users': [UserRole.Director],
      'create_order': [UserRole.Director],
      'approve_order': [UserRole.Director],
      
      // Finance actions
      'view_billing': [UserRole.Director, UserRole.Finance],
      'manage_payments': [UserRole.Director, UserRole.Finance],
      'view_financial_reports': [UserRole.Director, UserRole.Finance],
      
      // ColorGarb staff actions
      'manage_all_organizations': [UserRole.ColorGarbStaff],
      'system_administration': [UserRole.ColorGarbStaff],
      'cross_organization_access': [UserRole.ColorGarbStaff],
      'update_order_status': [UserRole.ColorGarbStaff],
      
      // Common actions
      'view_orders': [UserRole.Director, UserRole.Finance, UserRole.ColorGarbStaff],
      'view_dashboard': [UserRole.Director, UserRole.Finance, UserRole.ColorGarbStaff]
    };

    const allowedRoles = actionRoleMap[action];
    if (!allowedRoles) {
      return { hasPermission: false, reason: `Unknown action: ${action}` };
    }

    // Check if user has any of the allowed roles
    const hasRequiredRole = allowedRoles.includes(roleInfo.userRole);
    if (!hasRequiredRole) {
      return {
        hasPermission: false,
        reason: `Action '${action}' requires one of: ${allowedRoles.map(r => RoleUtils.getRoleInfo(r).name).join(', ')}`
      };
    }

    // If organization context is provided, validate organization access
    if (organizationId) {
      return canAccessOrganization(organizationId);
    }

    return { hasPermission: true };
  };

  // Convenience getters for common role checks
  const isDirector = hasRole(UserRole.Director);
  const isFinance = hasRole(UserRole.Finance);
  const isColorGarbStaff = hasRole(UserRole.ColorGarbStaff);
  const isOrganizationUser = isDirector || isFinance;

  return {
    // User role information
    userRole: roleInfo?.userRole || null,
    roleInfo: roleInfo?.roleInfo || null,
    isOrganizationScoped: roleInfo?.isOrganizationScoped || false,
    hasCrossOrganizationAccess: roleInfo?.hasCrossOrganizationAccess || false,
    
    // Role check functions
    hasRole,
    canAccess,
    canAccessOrganization,
    canPerformAction,
    
    // Convenience booleans
    isDirector,
    isFinance,
    isColorGarbStaff,
    isOrganizationUser,
    isAuthenticated: !!roleInfo,
    
    // User information
    user,
    organizationId: user?.organizationId || null
  };
};

export default useRolePermissions;