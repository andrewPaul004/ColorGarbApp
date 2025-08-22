/**
 * Authentication-related types for the ColorGarb application
 * @fileoverview Contains interfaces and types for login, tokens, and auth state
 */

/**
 * Login request payload interface
 * @interface LoginRequest
 */
export interface LoginRequest {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
}

/**
 * Authentication token response from login endpoint
 * @interface AuthTokenResponse
 */
export interface AuthTokenResponse {
  /** JWT access token */
  accessToken: string;
  /** Token type (typically "Bearer") */
  tokenType: string;
  /** Token expiration time in seconds */
  expiresIn: number;
  /** Authenticated user information */
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId?: string;
  };
}

/**
 * Password reset request payload
 * @interface PasswordResetRequest
 */
export interface PasswordResetRequest {
  /** Email address for password reset */
  email: string;
}

/**
 * Password reset confirmation payload
 * @interface PasswordResetConfirmation
 */
export interface PasswordResetConfirmation {
  /** Password reset token from email */
  token: string;
  /** New password */
  newPassword: string;
  /** Confirm new password */
  confirmPassword: string;
}

/**
 * Authentication state interface for frontend store
 * @interface AuthState
 */
export interface AuthState {
  /** Current authenticated user */
  user: AuthTokenResponse['user'] | null;
  /** Authentication token */
  token: string | null;
  /** Whether user is currently authenticated */
  isAuthenticated: boolean;
  /** Loading state for auth operations */
  isLoading: boolean;
  /** Authentication error message */
  error: string | null;
}

/**
 * Authentication actions interface for frontend store
 * @interface AuthActions
 */
export interface AuthActions {
  /** Login action */
  login: (email: string, password: string) => Promise<void>;
  /** Logout action */
  logout: () => void;
  /** Clear authentication error */
  clearError: () => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Refresh authentication token */
  refreshToken: () => Promise<void>;
}

/**
 * Combined authentication store interface
 * @interface AuthStore
 */
export interface AuthStore extends AuthState, AuthActions {}

/**
 * JWT token payload interface for decoding
 * @interface JwtPayload
 */
export interface JwtPayload {
  /** User ID */
  sub: string;
  /** User email */
  email: string;
  /** User name */
  name: string;
  /** User role */
  role: string;
  /** Organization ID */
  organizationId?: string;
  /** Token issued at time */
  iat: number;
  /** Token expiration time */
  exp: number;
  /** Token issuer */
  iss: string;
  /** Token audience */
  aud: string;
}

/**
 * Account lockout status interface
 * @interface AccountLockoutStatus
 */
export interface AccountLockoutStatus {
  /** Whether account is currently locked */
  isLocked: boolean;
  /** Number of failed login attempts */
  failedAttempts: number;
  /** Maximum allowed failed attempts */
  maxAttempts: number;
  /** Lockout duration in minutes */
  lockoutDuration: number;
  /** Time when account will be unlocked (if locked) */
  unlockTime?: Date;
}