/**
 * User and role-related types for the ColorGarb application
 * @fileoverview Contains interfaces and types for user roles, permissions, and management
 */

/**
 * User roles enum matching backend UserRole enum
 * @enum UserRole
 */
export enum UserRole {
  /** Director - Full access to organization data and operations */
  Director = 'Director',
  /** Finance User - Access to financial and payment operations */
  Finance = 'Finance',
  /** ColorGarb Staff - Cross-organization order management access */
  ColorGarbStaff = 'ColorGarbStaff'
}

/**
 * User role information interface
 * @interface RoleInfo
 */
export interface RoleInfo {
  /** Role enum value */
  role: UserRole;
  /** Human-readable role name */
  name: string;
  /** Role description */
  description: string;
  /** Whether role is organization-scoped */
  isOrganizationScoped: boolean;
  /** Whether role has cross-organization access */
  hasCrossOrganizationAccess: boolean;
}

/**
 * User interface extending the existing auth user
 * @interface User
 */
export interface User {
  /** Unique identifier for the user */
  id: string;
  /** User's email address */
  email: string;
  /** User's full name */
  name: string;
  /** User's role in the system */
  role: UserRole;
  /** Phone number (optional) */
  phone?: string;
  /** Organization ID (null for ColorGarb staff) */
  organizationId?: string;
  /** Whether account is active */
  isActive: boolean;
  /** Last login timestamp */
  lastLoginAt?: Date;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * User management request for role assignments
 * @interface UserManagementRequest
 */
export interface UserManagementRequest {
  /** User ID to update */
  userId: string;
  /** New role to assign */
  role: UserRole;
  /** Whether to activate/deactivate account */
  isActive?: boolean;
  /** Organization ID (for organization-scoped roles) */
  organizationId?: string;
}

/**
 * Role assignment response
 * @interface RoleAssignmentResponse
 */
export interface RoleAssignmentResponse {
  /** Whether assignment was successful */
  success: boolean;
  /** Updated user information */
  user: User;
  /** Success or error message */
  message: string;
}

/**
 * Permission check interface
 * @interface PermissionCheck
 */
export interface PermissionCheck {
  /** Required role for access */
  requiredRole: UserRole;
  /** Required organization ID (for org-scoped access) */
  organizationId?: string;
  /** Whether to allow cross-organization access */
  allowCrossOrganization?: boolean;
}

/**
 * Role-based route configuration
 * @interface RoleBasedRoute
 */
export interface RoleBasedRoute {
  /** Route path */
  path: string;
  /** Required role for access */
  requiredRole: UserRole;
  /** Whether route requires organization context */
  requiresOrganization: boolean;
  /** Component to render */
  component: React.ComponentType;
}

/**
 * Navigation menu item with role-based visibility
 * @interface NavigationItem
 */
export interface NavigationItem {
  /** Menu item label */
  label: string;
  /** Route path */
  path: string;
  /** Icon name or component */
  icon: string;
  /** Required role to see this menu item */
  requiredRole: UserRole;
  /** Whether item requires organization context */
  requiresOrganization: boolean;
  /** Child menu items */
  children?: NavigationItem[];
}

/**
 * Audit log entry for role-based access
 * @interface RoleAccessAudit
 */
export interface RoleAccessAudit {
  /** Unique audit entry ID */
  id: string;
  /** User who attempted access */
  userId: string;
  /** User's role at time of access */
  userRole: UserRole;
  /** Resource being accessed */
  resource: string;
  /** HTTP method used */
  method: string;
  /** Whether access was granted */
  accessGranted: boolean;
  /** Organization context (if applicable) */
  organizationId?: string;
  /** Timestamp of access attempt */
  timestamp: string;
  /** User's IP address */
  ipAddress: string;
  /** Additional context or error details */
  details?: string;
}

/**
 * Role permission matrix entry
 * @interface RolePermission
 */
export interface RolePermission {
  /** Role this permission applies to */
  role: UserRole;
  /** Resource or action being controlled */
  resource: string;
  /** Whether this role can read the resource */
  canRead: boolean;
  /** Whether this role can write/modify the resource */
  canWrite: boolean;
  /** Whether this role can delete the resource */
  canDelete: boolean;
  /** Whether access is organization-scoped */
  isOrganizationScoped: boolean;
}

/**
 * Helper functions for role management
 */
export const RoleUtils = {
  /**
   * Gets role information for a given role
   * @param role - The user role
   * @returns Role information object
   */
  getRoleInfo(role: UserRole): RoleInfo {
    switch (role) {
      case UserRole.Director:
        return {
          role,
          name: 'Director',
          description: 'Full access to organization data and operations',
          isOrganizationScoped: true,
          hasCrossOrganizationAccess: false
        };
      case UserRole.Finance:
        return {
          role,
          name: 'Finance User',
          description: 'Access to financial and payment operations',
          isOrganizationScoped: true,
          hasCrossOrganizationAccess: false
        };
      case UserRole.ColorGarbStaff:
        return {
          role,
          name: 'ColorGarb Staff',
          description: 'Cross-organization order management access',
          isOrganizationScoped: false,
          hasCrossOrganizationAccess: true
        };
      default:
        throw new Error(`Unknown role: ${role}`);
    }
  },

  /**
   * Checks if a role is organization-scoped
   * @param role - The user role to check
   * @returns True if role is organization-scoped
   */
  isOrganizationScoped(role: UserRole): boolean {
    return role === UserRole.Director || role === UserRole.Finance;
  },

  /**
   * Checks if a role has cross-organization access
   * @param role - The user role to check
   * @returns True if role can access multiple organizations
   */
  hasCrossOrganizationAccess(role: UserRole): boolean {
    return role === UserRole.ColorGarbStaff;
  },

  /**
   * Gets all available roles
   * @returns Array of all user roles
   */
  getAllRoles(): UserRole[] {
    return Object.values(UserRole);
  },

  /**
   * Checks if user has permission to access a resource
   * @param userRole - User's current role
   * @param userOrgId - User's organization ID
   * @param requiredRole - Required role for access
   * @param resourceOrgId - Resource's organization ID (if applicable)
   * @returns True if access is allowed
   */
  hasPermission(
    userRole: UserRole,
    userOrgId: string | undefined,
    requiredRole: UserRole,
    resourceOrgId?: string
  ): boolean {
    // ColorGarb staff has access to everything
    if (userRole === UserRole.ColorGarbStaff) {
      return true;
    }

    // Check if user has the required role
    if (userRole !== requiredRole && requiredRole !== UserRole.ColorGarbStaff) {
      // Allow if user has higher privileges (Director > Finance)
      if (userRole === UserRole.Director && requiredRole === UserRole.Finance) {
        // Director can access Finance-level resources in their org
      } else {
        return false;
      }
    }

    // For organization-scoped roles, check organization access
    if (this.isOrganizationScoped(userRole) && resourceOrgId) {
      return userOrgId === resourceOrgId;
    }

    return true;
  }
};