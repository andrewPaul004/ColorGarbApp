import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '../../src/stores/appStore';

/**
 * Test suite for useAppStore hook
 * Tests state management functionality
 */
describe('useAppStore', () => {
  /**
   * Reset store state before each test
   */
  beforeEach(() => {
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.clearState();
    });
  });

  /**
   * Test initial state values
   */
  test('has correct initial state', () => {
    const { result } = renderHook(() => useAppStore());
    
    expect(result.current.user).toBeNull();
    expect(result.current.organization).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  /**
   * Test setting user state
   */
  test('can set user', () => {
    const { result } = renderHook(() => useAppStore());
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'client' as const,
    };

    act(() => {
      result.current.setUser(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
  });

  /**
   * Test setting organization state
   */
  test('can set organization', () => {
    const { result } = renderHook(() => useAppStore());
    const mockOrg = {
      id: 'org-123',
      name: 'Test School',
      type: 'school' as const,
    };

    act(() => {
      result.current.setOrganization(mockOrg);
    });

    expect(result.current.organization).toEqual(mockOrg);
  });

  /**
   * Test setting loading state
   */
  test('can set loading state', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.isLoading).toBe(true);
  });

  /**
   * Test setting error state
   */
  test('can set error', () => {
    const { result } = renderHook(() => useAppStore());
    const errorMessage = 'Test error message';

    act(() => {
      result.current.setError(errorMessage);
    });

    expect(result.current.error).toBe(errorMessage);
  });

  /**
   * Test clearing all state
   */
  test('can clear all state', () => {
    const { result } = renderHook(() => useAppStore());
    
    // Set some state first
    act(() => {
      result.current.setUser({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'client',
      });
      result.current.setLoading(true);
      result.current.setError('Test error');
    });

    // Clear state
    act(() => {
      result.current.clearState();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.organization).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});