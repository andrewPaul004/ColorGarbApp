import { useCallback } from 'react';
import { useAdminStore } from '../stores/adminStore';
import type { UpdateOrderStageRequest, BulkUpdateRequest } from '../services/adminService';

/**
 * Custom hook for admin order operations
 * Provides simplified interfaces for common admin actions with proper error handling
 */
export const useAdminOperations = () => {
  const {
    updateOrderStage,
    bulkUpdateOrders,
    updateLoading,
    bulkUpdateLoading,
    updateError,
    successMessage,
    setUpdateError,
    setSuccessMessage,
    clearMessages,
  } = useAdminStore();

  /**
   * Update a single order with error handling and user feedback
   */
  const updateOrder = useCallback(async (
    orderId: string,
    stage: string,
    shipDate?: string,
    reason?: string
  ) => {
    try {
      clearMessages();
      const updates: UpdateOrderStageRequest = {
        stage,
        shipDate,
        reason: reason || 'Admin update',
      };
      
      await updateOrderStage(orderId, updates);
      return { success: true, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Update failed';
      return { success: false, error: errorMessage };
    }
  }, [updateOrderStage, clearMessages]);

  /**
   * Perform bulk updates with proper result handling
   */
  const bulkUpdate = useCallback(async (
    stage?: string,
    shipDate?: string,
    reason?: string
  ) => {
    try {
      clearMessages();
      const updates: Omit<BulkUpdateRequest, 'orderIds'> = {
        stage,
        shipDate,
        reason: reason || 'Bulk admin update',
      };
      
      const result = await bulkUpdateOrders(updates);
      return { 
        success: true, 
        result,
        error: null 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bulk update failed';
      return { 
        success: false, 
        result: null,
        error: errorMessage 
      };
    }
  }, [bulkUpdateOrders, clearMessages]);

  /**
   * Clear any existing messages
   */
  const clearAllMessages = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  /**
   * Set a custom error message
   */
  const setError = useCallback((error: string | null) => {
    setUpdateError(error);
  }, [setUpdateError]);

  /**
   * Set a custom success message
   */
  const setSuccess = useCallback((message: string | null) => {
    setSuccessMessage(message);
  }, [setSuccessMessage]);

  return {
    // Operations
    updateOrder,
    bulkUpdate,
    
    // State
    isUpdating: updateLoading,
    isBulkUpdating: bulkUpdateLoading,
    error: updateError,
    success: successMessage,
    
    // Utils
    clearMessages: clearAllMessages,
    setError,
    setSuccess,
  };
};