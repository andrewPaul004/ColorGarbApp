import { apiClient } from './apiClient';
import type {
  CommunicationAuditSearchRequest,
  CommunicationAuditResult,
  CommunicationLog,
  DeliveryStatusSummary,
  MessageEdit,
  NotificationDeliveryLog,
  ExportEstimation,
  ExportCommunicationRequest,
  SearchFacets
} from '../types/communicationAudit';

/**
 * API service for communication audit trail operations.
 * Handles all communication with the backend audit trail endpoints.
 * 
 * @since 3.4.0
 */
export const communicationAuditApi = {
  /**
   * Searches communication logs with filtering and pagination
   */
  async searchCommunications(request: CommunicationAuditSearchRequest): Promise<CommunicationAuditResult> {
    const response = await apiClient.get('/communication-audit/logs', {
      params: {
        ...request,
        communicationType: request.communicationType?.join(','),
        deliveryStatus: request.deliveryStatus?.join(',')
      }
    });
    
    return response.data;
  },

  /**
   * Gets communication history for a specific order
   */
  async getOrderHistory(orderId: string): Promise<CommunicationLog[]> {
    const response = await apiClient.get(`/communication-audit/orders/${orderId}`);
    return response.data;
  },

  /**
   * Gets detailed information for a specific communication log
   */
  async getCommunicationLog(logId: string): Promise<CommunicationLog> {
    const response = await apiClient.get(`/communication-audit/logs/${logId}`);
    return response.data;
  },

  /**
   * Gets delivery status summary for reporting
   */
  async getDeliverySummary(
    organizationId: string | undefined,
    from: string,
    to: string
  ): Promise<DeliveryStatusSummary> {
    const params: any = { from, to };
    if (organizationId) {
      params.organizationId = organizationId;
    }

    const response = await apiClient.get('/communication-audit/delivery-summary', { params });
    return response.data;
  },

  /**
   * Gets edit history for a message
   */
  async getEditHistory(messageId: string): Promise<MessageEdit[]> {
    const response = await apiClient.get(`/communication-audit/messages/${messageId}/edit-history`);
    return response.data;
  },

  /**
   * Gets delivery logs for a communication
   */
  async getDeliveryLogs(communicationLogId: string): Promise<NotificationDeliveryLog[]> {
    const response = await apiClient.get(`/communication-audit/logs/${communicationLogId}/delivery`);
    return response.data;
  },

  /**
   * Gets export size estimation
   */
  async getExportEstimation(searchCriteria: CommunicationAuditSearchRequest): Promise<ExportEstimation> {
    const response = await apiClient.post('/communication-export/estimate', searchCriteria);
    return response.data;
  },

  /**
   * Exports communication data in CSV format
   */
  async exportToCsv(request: ExportCommunicationRequest): Promise<void> {
    const response = await apiClient.post('/communication-export/csv', request, {
      responseType: 'blob'
    });
    
    this.downloadBlob(response.data, this.getFilename(response, 'csv'));
  },

  /**
   * Exports communication data in Excel format
   */
  async exportToExcel(request: ExportCommunicationRequest): Promise<void> {
    const response = await apiClient.post('/communication-export/excel', request, {
      responseType: 'blob'
    });
    
    this.downloadBlob(response.data, this.getFilename(response, 'xlsx'));
  },

  /**
   * Exports communication data in PDF format
   */
  async exportToPdf(request: ExportCommunicationRequest): Promise<void> {
    const response = await apiClient.post('/communication-export/compliance-report', {
      organizationId: request.searchCriteria.organizationId,
      from: request.searchCriteria.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: request.searchCriteria.dateTo || new Date().toISOString(),
      includeDetailedLogs: request.includeContent
    }, {
      responseType: 'blob'
    });
    
    this.downloadBlob(response.data, this.getFilename(response, 'pdf'));
  },

  /**
   * Generic export function that delegates to format-specific methods
   */
  async exportCommunications(
    request: ExportCommunicationRequest,
    format: 'csv' | 'excel' | 'pdf'
  ): Promise<void> {
    switch (format) {
      case 'csv':
        return this.exportToCsv(request);
      case 'excel':
        return this.exportToExcel(request);
      case 'pdf':
        return this.exportToPdf(request);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  },

  /**
   * Gets search suggestions for autocomplete
   */
  async getSearchSuggestions(partialTerm: string): Promise<string[]> {
    if (partialTerm.length < 2) return [];
    
    const response = await apiClient.get('/communication-audit/search-suggestions', {
      params: { term: partialTerm }
    });
    
    return response.data;
  },

  /**
   * Gets search facets for filtering options
   */
  async getSearchFacets(searchRequest: CommunicationAuditSearchRequest): Promise<SearchFacets> {
    const response = await apiClient.post('/communication-audit/facets', searchRequest);
    return response.data;
  },

  /**
   * Queues a large export for background processing
   */
  async queueLargeExport(
    request: ExportCommunicationRequest,
    format: 'csv' | 'excel' | 'pdf'
  ): Promise<{ jobId: string; status: string }> {
    const response = await apiClient.post(`/communication-export/queue/${format}`, request);
    return response.data;
  },

  /**
   * Gets the status of a queued export job
   */
  async getExportJobStatus(jobId: string): Promise<{ status: string; downloadUrl?: string; error?: string }> {
    const response = await apiClient.get(`/communication-export/jobs/${jobId}/status`);
    return response.data;
  },

  // Helper methods

  /**
   * Extracts filename from response headers or generates default
   */
  getFilename(response: any, defaultExtension: string): string {
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        return filenameMatch[1];
      }
    }
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    return `communication-audit-${timestamp}.${defaultExtension}`;
  },

  /**
   * Downloads a blob as a file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Formats search request for API consumption
   */
  formatSearchRequest(request: CommunicationAuditSearchRequest): any {
    return {
      ...request,
      // Convert array parameters to comma-separated strings for query params
      communicationType: request.communicationType?.join(','),
      deliveryStatus: request.deliveryStatus?.join(','),
      // Ensure proper date formatting
      dateFrom: request.dateFrom ? new Date(request.dateFrom).toISOString() : undefined,
      dateTo: request.dateTo ? new Date(request.dateTo).toISOString() : undefined
    };
  },

  /**
   * Validates search request parameters
   */
  validateSearchRequest(request: CommunicationAuditSearchRequest): string[] {
    const errors: string[] = [];

    if (request.page && request.page < 1) {
      errors.push('Page number must be greater than 0');
    }

    if (request.pageSize && (request.pageSize < 1 || request.pageSize > 100)) {
      errors.push('Page size must be between 1 and 100');
    }

    if (request.dateFrom && request.dateTo && new Date(request.dateFrom) > new Date(request.dateTo)) {
      errors.push('From date must be before to date');
    }

    const validSortFields = ['sentAt', 'deliveredAt', 'readAt', 'createdAt'];
    if (request.sortBy && !validSortFields.includes(request.sortBy)) {
      errors.push(`Invalid sort field. Valid options: ${validSortFields.join(', ')}`);
    }

    const validSortDirections = ['asc', 'desc'];
    if (request.sortDirection && !validSortDirections.includes(request.sortDirection)) {
      errors.push('Sort direction must be "asc" or "desc"');
    }

    return errors;
  }
};