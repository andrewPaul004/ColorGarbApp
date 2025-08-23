import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserRole, RoleUtils } from '@colorgarb/shared';
import { useAppStore } from '../../stores/appStore';

/**
 * Props for the ProtectedRoute component
 * @interface ProtectedRouteProps
 */
interface ProtectedRouteProps {
  /** Child components to render if access is granted */
  children: React.ReactNode;
  /** Required role for access (optional - if not provided, only checks authentication) */
  requiredRole?: UserRole;
  /** Required organization ID for organization-scoped access */
  organizationId?: string;
  /** Whether to allow cross-organization access for ColorGarb staff */
  allowCrossOrganization?: boolean;
  /** Custom redirect path if access is denied */
  redirectTo?: string;
}

/**
 * ProtectedRoute component that provides role-based access control.
 * Checks user authentication and role permissions before rendering children.
 * 
 * @component
 * @param {ProtectedRouteProps} props - Component props
 * @returns {JSX.Element} Protected route content or redirect
 * 
 * @example
 * ```tsx
 * // Require authentication only
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 * 
 * // Require Director role
 * <ProtectedRoute requiredRole={UserRole.Director}>
 *   <OrganizationSettings />
 * </ProtectedRoute>
 * 
 * // Require ColorGarb staff access
 * <ProtectedRoute requiredRole={UserRole.ColorGarbStaff}>
 *   <AdminDashboard />
 * </ProtectedRoute>
 * ```
 * 
 * @since 1.0.0
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  organizationId,
  allowCrossOrganization = true, // eslint-disable-line @typescript-eslint/no-unused-vars
  redirectTo
}) => {
  const { isAuthenticated, user } = useAppStore();
  const location = useLocation();

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Convert backend role string to UserRole enum
  const userRole = user.role as UserRole;

  // If no specific role is required, just check authentication
  if (!requiredRole) {
    return <>{children}</>;
  }

  // Check role-based permissions
  const hasPermission = RoleUtils.hasPermission(
    userRole,
    user.organizationId,
    requiredRole,
    organizationId
  );

  if (!hasPermission) {
    // Determine appropriate redirect based on user's role
    const getRedirectPath = () => {
      if (redirectTo) return redirectTo;
      
      // Role-specific default redirects
      switch (userRole) {
        case UserRole.ColorGarbStaff:
          return '/admin/dashboard';
        case UserRole.Director:
        case UserRole.Finance:
          return '/dashboard';
        default:
          return '/unauthorized';
      }
    };

    return <Navigate to={getRedirectPath()} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;