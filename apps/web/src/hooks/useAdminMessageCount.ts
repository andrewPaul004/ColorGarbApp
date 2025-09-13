import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import adminMessageService from '../services/adminMessageService';

/**
 * Hook for managing admin message unread count
 * Provides real-time unread count for ColorGarb staff members
 */
export const useAdminMessageCount = () => {
  const { user, isAuthenticated } = useAppStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Checks if user has admin access
   */
  const hasAdminAccess = user?.role === 'ColorGarbStaff';

  /**
   * Fetches the current unread count
   */
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !hasAdminAccess) {
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await adminMessageService.getUnreadCount();
      setUnreadCount(response.unreadCount);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch unread count';
      setError(errorMessage);
      console.error('Error fetching admin unread count:', err);
      // Don't reset count on error to avoid UI flickering
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, hasAdminAccess]);

  /**
   * Refreshes the unread count
   */
  const refreshCount = useCallback(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  /**
   * Decrements the unread count (called when messages are marked as read)
   */
  const decrementCount = useCallback((amount: number) => {
    setUnreadCount(prev => Math.max(0, prev - amount));
  }, []);

  // Initial load and periodic refresh
  useEffect(() => {
    if (hasAdminAccess) {
      fetchUnreadCount();
      
      // Refresh every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [hasAdminAccess, fetchUnreadCount]);

  // Reset when user logs out or loses admin access
  useEffect(() => {
    if (!isAuthenticated || !hasAdminAccess) {
      setUnreadCount(0);
      setError(null);
    }
  }, [isAuthenticated, hasAdminAccess]);

  return {
    unreadCount,
    loading,
    error,
    hasAdminAccess,
    refreshCount,
    decrementCount,
  };
};