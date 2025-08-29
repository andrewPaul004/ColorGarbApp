import { useState, useCallback } from 'react';
import { communicationAuditApi } from '../services/communicationAuditApi';
import type {
  CommunicationAuditSearchRequest,
  CommunicationAuditResult,
  CommunicationLog,
  DeliveryStatusSummary,
  MessageEdit,
  NotificationDeliveryLog,
  ExportEstimation,
  ExportCommunicationRequest
} from '../types/communicationAudit';

/**
 * Custom hook for managing communication audit trail data and operations.
 * Provides state management and API interaction for audit functionality.
 * 
 * @returns {UseCommunicationAuditResult} Hook result with data and operations
 * 
 * @example
 * ```typescript
 * const {
 *   searchResults,
 *   loading,
 *   error,
 *   searchCommunications
 * } = useCommunicationAudit();
 * 
 * // Search communications
 * await searchCommunications({
 *   searchTerm: 'order update',
 *   communicationType: ['Email'],
 *   page: 1,
 *   pageSize: 20
 * });
 * ```
 * 
 * @since 3.4.0
 */
export const useCommunicationAudit = () => {
  // State management
  const [searchResults, setSearchResults] = useState<CommunicationAuditResult | null>(null);
  const [deliverySummary, setDeliverySummary] = useState<DeliveryStatusSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Searches communication logs with specified criteria
   */
  const searchCommunications = useCallback(async (request: CommunicationAuditSearchRequest) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await communicationAuditApi.searchCommunications(request);
      setSearchResults(result);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search communications';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Gets communication history for a specific order
   */
  const getOrderHistory = useCallback(async (orderId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const history = await communicationAuditApi.getOrderHistory(orderId);
      return history;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load order history';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Gets detailed information for a specific communication log
   */
  const getCommunicationLog = useCallback(async (logId: string) => {
    try {
      setError(null);
      
      const log = await communicationAuditApi.getCommunicationLog(logId);
      return log;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load communication details';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Gets delivery status summary for reporting
   */
  const getDeliverySummary = useCallback(async (
    organizationId: string | undefined,
    from: string,
    to: string
  ) => {
    try {
      setError(null);
      
      const summary = await communicationAuditApi.getDeliverySummary(organizationId, from, to);
      setDeliverySummary(summary);
      
      return summary;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load delivery summary';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Gets edit history for a message
   */
  const getEditHistory = useCallback(async (messageId: string) => {
    try {
      setError(null);
      
      const history = await communicationAuditApi.getEditHistory(messageId);
      return history;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load edit history';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Gets delivery logs for a communication
   */
  const getDeliveryLogs = useCallback(async (communicationLogId: string) => {
    try {
      setError(null);
      
      const logs = await communicationAuditApi.getDeliveryLogs(communicationLogId);
      return logs;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load delivery logs';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Gets export size estimation
   */
  const getExportEstimation = useCallback(async (searchCriteria: CommunicationAuditSearchRequest) => {
    try {
      setError(null);
      
      const estimation = await communicationAuditApi.getExportEstimation(searchCriteria);
      return estimation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get export estimation';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Exports communication data in specified format
   */
  const exportCommunications = useCallback(async (
    request: ExportCommunicationRequest | CommunicationAuditSearchRequest,
    format: 'csv' | 'excel' | 'pdf'
  ) => {
    try {
      setLoading(true);
      setError(null);

      let exportRequest: ExportCommunicationRequest;
      
      if ('searchCriteria' in request) {
        exportRequest = request;
      } else {
        exportRequest = {
          searchCriteria: request,
          format,
          includeContent: false,
          includeMetadata: false,
          maxRecords: 10000
        };
      }
      
      await communicationAuditApi.exportCommunications(exportRequest, format);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clears current error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refreshes current search results
   */
  const refreshResults = useCallback(async () => {
    if (searchResults) {
      // Use the last search criteria to refresh
      const lastSearchRequest: CommunicationAuditSearchRequest = {
        searchTerm: '',
        page: searchResults.page,
        pageSize: searchResults.pageSize,
        sortBy: 'sentAt',
        sortDirection: 'desc'
      };
      
      await searchCommunications(lastSearchRequest);
    }
  }, [searchResults, searchCommunications]);

  /**
   * Gets search suggestions for autocomplete
   */
  const getSearchSuggestions = useCallback(async (partialTerm: string) => {
    try {
      setError(null);
      
      const suggestions = await communicationAuditApi.getSearchSuggestions(partialTerm);
      return suggestions;
    } catch (err) {
      // Don't set error state for suggestions, just return empty array
      return [];
    }
  }, []);

  /**
   * Gets search facets for filtering
   */
  const getSearchFacets = useCallback(async (searchRequest: CommunicationAuditSearchRequest) => {
    try {
      setError(null);
      
      const facets = await communicationAuditApi.getSearchFacets(searchRequest);
      return facets;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load search facets';
      setError(errorMessage);
      throw err;
    }
  }, []);

  return {
    // State
    searchResults,
    deliverySummary,
    loading,
    error,
    
    // Operations
    searchCommunications,
    getOrderHistory,
    getCommunicationLog,
    getDeliverySummary,
    getEditHistory,
    getDeliveryLogs,
    getExportEstimation,
    exportCommunications,
    getSearchSuggestions,
    getSearchFacets,
    
    // Utilities
    clearError,
    refreshResults
  };
};

/**
 * Result type for the useCommunicationAudit hook
 */
export interface UseCommunicationAuditResult {
  // State
  searchResults: CommunicationAuditResult | null;
  deliverySummary: DeliveryStatusSummary | null;
  loading: boolean;
  error: string | null;
  
  // Operations
  searchCommunications: (request: CommunicationAuditSearchRequest) => Promise<CommunicationAuditResult>;
  getOrderHistory: (orderId: string) => Promise<CommunicationLog[]>;
  getCommunicationLog: (logId: string) => Promise<CommunicationLog>;
  getDeliverySummary: (organizationId: string | undefined, from: string, to: string) => Promise<DeliveryStatusSummary>;
  getEditHistory: (messageId: string) => Promise<MessageEdit[]>;
  getDeliveryLogs: (communicationLogId: string) => Promise<NotificationDeliveryLog[]>;
  getExportEstimation: (searchCriteria: CommunicationAuditSearchRequest) => Promise<ExportEstimation>;
  exportCommunications: (request: ExportCommunicationRequest | CommunicationAuditSearchRequest, format: 'csv' | 'excel' | 'pdf') => Promise<void>;
  getSearchSuggestions: (partialTerm: string) => Promise<string[]>;
  getSearchFacets: (searchRequest: CommunicationAuditSearchRequest) => Promise<any>;
  
  // Utilities
  clearError: () => void;
  refreshResults: () => Promise<void>;
}