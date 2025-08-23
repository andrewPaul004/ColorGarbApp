import React from 'react';
import { UserRole } from '@colorgarb/shared';
import ProtectedRoute from './ProtectedRoute';

/**
 * Higher-order component that wraps components with role-based protection
 * @param Component - Component to protect
 * @param requiredRole - Required role for access
 * @returns Protected component
 */
export const withRoleProtection = (
  Component: React.ComponentType<Record<string, unknown>>,
  requiredRole?: UserRole
) => {
  return (props: Record<string, unknown>) => (
    <ProtectedRoute requiredRole={requiredRole}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

export default withRoleProtection;