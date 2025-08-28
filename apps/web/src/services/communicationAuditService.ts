import { apiClient, downloadFile } from './apiClient';
import type {
  CommunicationLog,
  CommunicationAuditSearchRequest,
  CommunicationAuditResult,
  DeliveryStatusSummary,
  ExportCommunicationRequest,
  ExportCommunicationResult,
  ComplianceReportRequest
} from '../types/shared';

/**
 * Service for communication audit trail API operations.
 * Handles searching, filtering, exporting, and reporting on communication logs.
 * 
 * @since 3.4.0
 */
class CommunicationAuditService {
  private readonly baseUrl = '/api/communication-reports';

  /**
   * Searches communication audit logs with filtering and pagination.
   */
  async searchCommunicationLogs(request: CommunicationAuditSearchRequest): Promise<CommunicationAuditResult> {
    try {
      const response = await apiClient.post<CommunicationAuditResult>(
        `${this.baseUrl}/search`,
        this.sanitizeSearchRequest(request)
      );
      
      return this.parseCommunicationResult(response.data);
    } catch (error) {
      console.error('Failed to search communication logs:', error);
      throw new Error('Failed to load communication audit data');
    }
  }

  /**
   * Gets delivery status summary for a date range and organization.
   */
  async getDeliveryStatusSummary(
    organizationId: string,
    from: Date,
    to: Date
  ): Promise<DeliveryStatusSummary> {
    try {
      const params = new URLSearchParams({
        organizationId,
        from: from.toISOString(),
        to: to.toISOString()
      });

      const response = await apiClient.get<DeliveryStatusSummary>(
        `${this.baseUrl}/summary?${params}`
      );
      
      return this.parseDeliveryStatusSummary(response.data);
    } catch (error) {
      console.error('Failed to get delivery status summary:', error);
      throw new Error('Failed to load delivery status summary');
    }
  }

  /**
   * Exports communication data to CSV format.
   */
  async exportToCsv(request: ExportCommunicationRequest): Promise<ExportCommunicationResult | Blob> {
    try {
      const response = await apiClient.post(
        `${this.baseUrl}/export/csv`,
        this.sanitizeExportRequest(request),
        {
          responseType: 'blob',
          headers: {
            'Accept': 'text/csv, application/json'
          }
        }
      );

      // Check if response is a file (small export) or job reference (large export)
      const contentType = response.headers['content-type'];
      
      if (contentType?.includes('text/csv') || contentType?.includes('application/octet-stream')) {
        // Direct file download
        return new Blob([response.data], { type: 'text/csv' });
      } else {
        // Async job reference
        const jobResult = JSON.parse(await response.data.text()) as ExportCommunicationResult;
        return jobResult;
      }
    } catch (error) {
      console.error('Failed to export to CSV:', error);
      throw new Error('Failed to export communication data to CSV');
    }
  }

  /**
   * Exports communication data to Excel format.
   */
  async exportToExcel(request: ExportCommunicationRequest): Promise<ExportCommunicationResult | Blob> {
    try {
      const response = await apiClient.post(
        `${this.baseUrl}/export/excel`,
        this.sanitizeExportRequest(request),
        {
          responseType: 'blob',
          headers: {
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json'
          }
        }
      );

      const contentType = response.headers['content-type'];
      
      if (contentType?.includes('spreadsheetml') || contentType?.includes('application/octet-stream')) {
        // Direct file download
        return new Blob([response.data], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
      } else {
        // Async job reference
        const jobResult = JSON.parse(await response.data.text()) as ExportCommunicationResult;
        return jobResult;
      }
    } catch (error) {
      console.error('Failed to export to Excel:', error);
      throw new Error('Failed to export communication data to Excel');
    }
  }

  /**
   * Generates a compliance report in PDF format.
   */
  async generateComplianceReport(request: ComplianceReportRequest): Promise<Blob> {
    try {
      const response = await apiClient.post(
        `${this.baseUrl}/reports/compliance-pdf`,
        this.sanitizeComplianceReportRequest(request),
        {
          responseType: 'blob',
          headers: {
            'Accept': 'application/pdf'
          }
        }
      );

      return new Blob([response.data], { type: 'application/pdf' });
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw new Error('Failed to generate compliance report');
    }
  }

  /**
   * Gets the status of an export job.
   */
  async getExportStatus(jobId: string): Promise<ExportCommunicationResult> {
    try {
      const response = await apiClient.get<ExportCommunicationResult>(
        `${this.baseUrl}/export/status/${jobId}`
      );
      
      return response.data;
    } catch (error) {
      console.error('Failed to get export status:', error);
      throw new Error('Failed to check export status');
    }
  }

  /**
   * Downloads a completed export file.
   */
  async downloadExport(jobId: string, filename?: string): Promise<void> {
    try {
      await downloadFile(`${this.baseUrl}/export/download/${jobId}`, filename);
    } catch (error) {
      console.error('Failed to download export file:', error);
      throw new Error('Failed to download export file');
    }
  }

  /**
   * Gets communication history for a specific order.
   */
  async getOrderCommunicationHistory(orderId: string, page = 1, pageSize = 50): Promise<CommunicationAuditResult> {
    const searchRequest: CommunicationAuditSearchRequest = {
      orderId,
      page,
      pageSize,
      sortBy: 'sentAt',
      sortDirection: 'desc'
    };

    return this.searchCommunicationLogs(searchRequest);
  }

  /**
   * Triggers a file download from a Blob.
   */
  downloadBlob(blob: Blob, filename: string): void {
    try {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
      throw new Error('Failed to download file');
    }
  }

  /**
   * Sanitizes and validates search request parameters.
   */
  private sanitizeSearchRequest(request: CommunicationAuditSearchRequest): CommunicationAuditSearchRequest {
    return {
      ...request,
      page: Math.max(1, request.page || 1),
      pageSize: Math.min(100, Math.max(10, request.pageSize || 50)),
      sortBy: request.sortBy || 'sentAt',
      sortDirection: request.sortDirection || 'desc'
    };
  }

  /**
   * Sanitizes and validates export request parameters.
   */
  private sanitizeExportRequest(request: ExportCommunicationRequest): ExportCommunicationRequest {
    return {
      ...request,
      maxRecords: Math.min(100000, request.maxRecords || 10000),
      searchCriteria: this.sanitizeSearchRequest(request.searchCriteria)
    };
  }

  /**
   * Sanitizes and validates compliance report request parameters.
   */
  private sanitizeComplianceReportRequest(request: ComplianceReportRequest): ComplianceReportRequest {
    return {
      ...request,
      includeFailureAnalysis: request.includeFailureAnalysis ?? true,
      includeCharts: request.includeCharts ?? true
    };
  }

  /**
   * Parses and transforms communication result dates.
   */
  private parseCommunicationResult(data: CommunicationAuditResult): CommunicationAuditResult {
    return {
      ...data,
      logs: data.logs.map(log => ({
        ...log,
        sentAt: new Date(log.sentAt),
        deliveredAt: log.deliveredAt ? new Date(log.deliveredAt) : undefined,
        readAt: log.readAt ? new Date(log.readAt) : undefined,
        createdAt: new Date(log.createdAt)
      }))
    };
  }

  /**
   * Parses and transforms delivery status summary dates.
   */
  private parseDeliveryStatusSummary(data: DeliveryStatusSummary): DeliveryStatusSummary {
    return {
      ...data,
      from: new Date(data.from),
      to: new Date(data.to)
    };
  }
}

export const communicationAuditService = new CommunicationAuditService();
export default communicationAuditService;