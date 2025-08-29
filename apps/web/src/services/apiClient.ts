import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';

/**
 * HTTP client configuration and interceptors for API communication.
 * Provides centralized request/response handling, authentication, and error management.
 * 
 * Features:
 * - Automatic authentication token injection
 * - Request/response logging in development
 * - Error response standardization
 * - Request timeout handling
 * - Base URL configuration
 * 
 * @since 3.1.0
 */

// Base configuration for API client
const createApiClient = (): AxiosInstance => {
  const baseURL = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5132'  // Development API URL
    : '/';                     // Production API URL (proxied)

  const client = axios.create({
    baseURL,
    timeout: 30000, // 30 second timeout
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  // Request interceptor for authentication and logging
  client.interceptors.request.use(
    (config) => {
      // Add authentication token if available
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Log requests in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
          data: config.data,
          params: config.params,
        });
      }

      return config;
    },
    (error) => {
      console.error('[API] Request error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor for logging and error handling
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // Log successful responses in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
          status: response.status,
          data: response.data,
        });
      }

      return response;
    },
    (error) => {
      // Log errors with structured logging
      const logData = {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message
      };
      console.error('[API] Response error:', logData);

      // Handle specific error cases
      if (error.response) {
        // Server responded with error status
        const { status, data } = error.response;
        
        // Handle authentication errors
        if (status === 401) {
          handleAuthenticationError();
        }
        
        // Handle rate limiting
        if (status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          error.retryAfter = retryAfter ? parseInt(retryAfter) : 60;
          error.message = `Rate limit exceeded. Please try again in ${error.retryAfter} seconds.`;
        }
        
        // Handle validation errors
        if (status === 400 && data?.errors) {
          error.validationErrors = data.errors;
          error.message = 'Validation failed';
        }
        
        // Enhance error with response details
        error.message = data?.message || data?.error || `HTTP ${status}: ${error.message}`;
      } else if (error.request) {
        // Request made but no response received
        if (error.code === 'ECONNABORTED') {
          error.message = 'Request timeout - please try again';
        } else {
          error.message = 'Network error: Unable to connect to server';
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * Gets authentication token from storage
 */
const getAuthToken = (): string | null => {
  try {
    // Check sessionStorage first (temporary session)
    let token = sessionStorage.getItem('authToken');
    
    // Fall back to localStorage (persistent login)
    if (!token) {
      token = localStorage.getItem('authToken');
    }
    
    return token;
  } catch (error) {
    console.warn('Failed to retrieve auth token from storage:', error);
    return null;
  }
};

/**
 * Handles authentication errors by clearing tokens and redirecting
 */
const handleAuthenticationError = (): void => {
  try {
    // Clear stored tokens
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('authToken');
    
    // Dispatch logout event for components to react
    window.dispatchEvent(new CustomEvent('auth:logout'));
    
    // Redirect to login page if not already there
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Error handling authentication failure:', error);
  }
};

/**
 * Sets authentication token in storage and axios default headers
 */
export const setAuthToken = (token: string, persistent = false): void => {
  try {
    if (persistent) {
      localStorage.setItem('authToken', token);
    } else {
      sessionStorage.setItem('authToken', token);
    }
  } catch (error) {
    console.error('Failed to store auth token:', error);
  }
};

/**
 * Clears authentication token from storage and axios default headers
 */
export const clearAuthToken = (): void => {
  try {
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('authToken');
  } catch (error) {
    console.error('Failed to clear auth token:', error);
  }
};

/**
 * Creates a new API client instance
 */
export const apiClient = createApiClient();

/**
 * Helper function for handling file uploads
 */
export const uploadFile = async (
  url: string, 
  file: File, 
  onProgress?: (progress: number) => void
): Promise<AxiosResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });
};

/**
 * Helper function for downloading files
 */
export const downloadFile = async (url: string, filename?: string): Promise<void> => {
  try {
    const response = await apiClient.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Failed to download file:', error);
    throw error;
  }
};

export default apiClient;