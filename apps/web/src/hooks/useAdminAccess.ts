import { useMemo } from 'react';
import { useAppStore } from '../stores/appStore';

/**
 * Custom hook for checking admin access permissions
 * Provides role-based access control for ColorGarbStaff features
 */
export const useAdminAccess = () => {
  const { user, isAuthenticated } = useAppStore();

  const accessInfo = useMemo(() => {
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      return {
        hasAccess: false,
        isColorGarbStaff: false,
        canViewAllOrders: false,
        canUpdateOrders: false,
        canBulkUpdate: false,
        reason: 'User not authenticated',
      };
    }

    // Check if user has ColorGarbStaff role
    const isColorGarbStaff = user.role === 'colorgarb_staff' || user.role === 'ColorGarbStaff';

    if (!isColorGarbStaff) {
      return {
        hasAccess: false,
        isColorGarbStaff: false,
        canViewAllOrders: false,
        canUpdateOrders: false,
        canBulkUpdate: false,
        reason: 'User does not have admin permissions',
      };
    }

    // User has full admin access
    return {
      hasAccess: true,
      isColorGarbStaff: true,
      canViewAllOrders: true,
      canUpdateOrders: true,
      canBulkUpdate: true,
      reason: null,
    };
  }, [isAuthenticated, user]);

  return {
    ...accessInfo,
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.name,
  };
};

/**
 * Helper hook that throws an error if user doesn't have admin access
 * Use this in admin components that require strict access control
 */
export const useRequireAdminAccess = () => {
  const access = useAdminAccess();

  if (!access.hasAccess) {
    throw new Error(access.reason || 'Access denied');
  }

  return access;
};