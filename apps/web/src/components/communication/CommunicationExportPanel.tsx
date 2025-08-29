import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Card,
  CardContent,
  Tooltip
} from '@mui/material';
import {
  FileDownload as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Description as CsvIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  Schedule as ProcessingIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import type { 
  CommunicationAuditSearchRequest,
  ExportCommunicationRequest,
  ExportCommunicationResult,
  ComplianceReportRequest
} from '../../types/shared';
import communicationAuditService from '../../services/communicationAuditService';

/**
 * Props for the CommunicationExportPanel component
 */
interface CommunicationExportPanelProps {
  /** Current search criteria to export */
  searchCriteria: CommunicationAuditSearchRequest;
  /** Organization ID for compliance reports */
  organizationId?: string;
  /** Whether the panel is open */
  open: boolean;
  /** Callback when the panel is closed */
  onClose: () => void;
}

/**
 * Communication export panel with format selection and download management.
 * Handles CSV, Excel, and PDF exports with progress tracking.
 * 
 * @component
 * @since 3.4.0
 */
export const CommunicationExportPanel: React.FC<CommunicationExportPanelProps> = ({
  searchCriteria,
  organizationId,
  open,
  onClose
}) => {
  const [exportFormat, setExportFormat] = useState<'CSV' | 'Excel' | 'PDF'>('CSV');
  const [includeContent, setIncludeContent] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [maxRecords, setMaxRecords] = useState(10000);
  const [reportTitle, setReportTitle] = useState('');
  const [includeFailureAnalysis, setIncludeFailureAnalysis] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [activeExports, setActiveExports] = useState<ExportCommunicationResult[]>([]);

  /**
   * Load active export jobs on mount
   */
  useEffect(() => {
    if (open) {
      loadActiveExports();
    }
  }, [open]);

  /**
   * Load active export jobs from localStorage
   */
  const loadActiveExports = () => {
    try {
      const stored = localStorage.getItem('communication-exports');
      if (stored) {
        const exports = JSON.parse(stored) as ExportCommunicationResult[];
        setActiveExports(exports.filter(exp => exp.status === 'Processing'));
        
        // Check status of processing exports
        exports.forEach(async (exp) => {
          if (exp.status === 'Processing') {
            try {
              const updated = await communicationAuditService.getExportStatus(exp.jobId);
              updateExportStatus(exp.jobId, updated);
            } catch (error) {
              console.error('Failed to check export status:', error);
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to load active exports:', error);
    }
  };

  /**
   * Save active exports to localStorage
   */
  const saveActiveExports = (exports: ExportCommunicationResult[]) => {
    try {
      localStorage.setItem('communication-exports', JSON.stringify(exports));
    } catch (error) {
      console.error('Failed to save active exports:', error);
    }
  };

  /**
   * Update export status
   */
  const updateExportStatus = (jobId: string, updated: ExportCommunicationResult) => {
    setActiveExports(prev => {
      const newExports = prev.map(exp => 
        exp.jobId === jobId ? updated : exp
      );
      saveActiveExports(newExports);
      return newExports;
    });
  };

  /**
   * Start export process
   */
  const handleExport = useCallback(async () => {
    try {
      setExporting(true);
      setExportError(null);

      if (exportFormat === 'PDF') {
        // PDF compliance report
        if (!organizationId) {
          throw new Error('Organization ID is required for PDF reports');
        }

        const reportRequest: ComplianceReportRequest = {
          organizationId,
          dateFrom: searchCriteria.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          dateTo: searchCriteria.dateTo || new Date(),
          includeFailureAnalysis,
          includeCharts,
          reportTitle: reportTitle || undefined
        };

        const blob = await communicationAuditService.generateComplianceReport(reportRequest);
        const filename = `communication-compliance-${new Date().toISOString().split('T')[0]}.pdf`;
        communicationAuditService.downloadBlob(blob, filename);
      } else {
        // CSV or Excel export
        const exportRequest: ExportCommunicationRequest = {
          searchCriteria,
          format: exportFormat,
          includeContent,
          includeMetadata,
          maxRecords
        };

        let result: ExportCommunicationResult | Blob;
        
        if (exportFormat === 'CSV') {
          result = await communicationAuditService.exportToCsv(exportRequest);
        } else {
          result = await communicationAuditService.exportToExcel(exportRequest);
        }

        if (result instanceof Blob) {
          // Direct download
          const extension = exportFormat.toLowerCase();
          const filename = `communication-audit-${new Date().toISOString().split('T')[0]}.${extension}`;
          communicationAuditService.downloadBlob(result, filename);
        } else {
          // Async job
          const newExports = [...activeExports, result];
          setActiveExports(newExports);
          saveActiveExports(newExports);
          
          // Poll for status updates
          pollExportStatus(result.jobId);
        }
      }

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }, [
    exportFormat,
    searchCriteria,
    organizationId,
    includeContent,
    includeMetadata,
    maxRecords,
    reportTitle,
    includeFailureAnalysis,
    includeCharts,
    activeExports,
    onClose
  ]);

  /**
   * Poll export status until completion
   */
  const pollExportStatus = async (jobId: string) => {
    const poll = async () => {
      try {
        const status = await communicationAuditService.getExportStatus(jobId);
        updateExportStatus(jobId, status);

        if (status.status === 'Processing') {
          setTimeout(poll, 5000); // Poll every 5 seconds
        }
      } catch (error) {
        console.error('Failed to poll export status:', error);
      }
    };

    setTimeout(poll, 2000); // Initial delay
  };

  /**
   * Download completed export
   */
  const handleDownload = async (export_: ExportCommunicationResult) => {
    try {
      const extension = export_.jobId.includes('excel') ? 'xlsx' : 'csv';
      const filename = `communication-export-${export_.jobId.slice(0, 8)}.${extension}`;
      await communicationAuditService.downloadExport(export_.jobId, filename);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  /**
   * Remove export from list
   */
  const handleRemoveExport = (jobId: string) => {
    const newExports = activeExports.filter(exp => exp.jobId !== jobId);
    setActiveExports(newExports);
    saveActiveExports(newExports);
  };

  /**
   * Refresh export status
   */
  const handleRefreshStatus = async (jobId: string) => {
    try {
      const status = await communicationAuditService.getExportStatus(jobId);
      updateExportStatus(jobId, status);
    } catch (error) {
      console.error('Failed to refresh status:', error);
    }
  };

  /**
   * Get export format icon
   */
  const getFormatIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'csv':
        return <CsvIcon />;
      case 'excel':
        return <ExcelIcon />;
      case 'pdf':
        return <PdfIcon />;
      default:
        return <DownloadIcon />;
    }
  };

  /**
   * Get status icon and color
   */
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'Completed':
        return { icon: <CompleteIcon color="success" />, color: 'success' as const };
      case 'Failed':
        return { icon: <ErrorIcon color="error" />, color: 'error' as const };
      case 'Processing':
        return { icon: <ProcessingIcon color="primary" />, color: 'primary' as const };
      default:
        return { icon: <InfoIcon />, color: 'default' as const };
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Export Communication Data
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          {/* Export Format Selection */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Export Format
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Format</InputLabel>
                <Select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'CSV' | 'Excel' | 'PDF')}
                  label="Format"
                >
                  <MenuItem value="CSV">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CsvIcon />
                      CSV - Comma Separated Values
                    </Box>
                  </MenuItem>
                  <MenuItem value="Excel">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ExcelIcon />
                      Excel - Formatted Spreadsheet
                    </Box>
                  </MenuItem>
                  <MenuItem value="PDF">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PdfIcon />
                      PDF - Compliance Report
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              {/* CSV/Excel Options */}
              {exportFormat !== 'PDF' && (
                <Box>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={includeContent}
                        onChange={(e) => setIncludeContent(e.target.checked)}
                      />
                    }
                    label="Include Message Content"
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={includeMetadata}
                        onChange={(e) => setIncludeMetadata(e.target.checked)}
                      />
                    }
                    label="Include Metadata"
                  />

                  <TextField
                    fullWidth
                    type="number"
                    label="Maximum Records"
                    value={maxRecords}
                    onChange={(e) => setMaxRecords(Math.max(1, parseInt(e.target.value) || 1))}
                    inputProps={{ min: 1, max: 100000 }}
                    sx={{ mt: 1 }}
                  />
                </Box>
              )}

              {/* PDF Options */}
              {exportFormat === 'PDF' && (
                <Box>
                  <TextField
                    fullWidth
                    label="Report Title (Optional)"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={includeFailureAnalysis}
                        onChange={(e) => setIncludeFailureAnalysis(e.target.checked)}
                      />
                    }
                    label="Include Failure Analysis"
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={includeCharts}
                        onChange={(e) => setIncludeCharts(e.target.checked)}
                      />
                    }
                    label="Include Charts and Graphs"
                  />
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Active Exports */}
          {activeExports.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Active Exports
                </Typography>
                
                <List>
                  {activeExports.map((export_) => {
                    const statusDisplay = getStatusDisplay(export_.status);
                    
                    return (
                      <React.Fragment key={export_.jobId}>
                        <ListItem>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                            {getFormatIcon(export_.jobId)}
                            {statusDisplay.icon}
                          </Box>
                          
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">
                                  Export Job #{export_.jobId.slice(0, 8)}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={export_.status}
                                  color={statusDisplay.color}
                                  variant="outlined"
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {export_.recordCount} records
                                  {export_.status === 'Completed' && export_.downloadUrl && 
                                    ' - Ready for download'
                                  }
                                  {export_.status === 'Failed' && export_.errorMessage &&
                                    ` - ${export_.errorMessage}`
                                  }
                                </Typography>
                                {export_.status === 'Processing' && (
                                  <LinearProgress sx={{ mt: 1 }} />
                                )}
                              </Box>
                            }
                          />
                          
                          <ListItemSecondaryAction>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {export_.status === 'Completed' && (
                                <Tooltip title="Download">
                                  <IconButton
                                    onClick={() => handleDownload(export_)}
                                    color="primary"
                                  >
                                    <DownloadIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              
                              {export_.status === 'Processing' && (
                                <Tooltip title="Refresh Status">
                                  <IconButton
                                    onClick={() => handleRefreshStatus(export_.jobId)}
                                  >
                                    <RefreshIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              
                              <Tooltip title="Remove">
                                <IconButton
                                  onClick={() => handleRemoveExport(export_.jobId)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </ListItemSecondaryAction>
                        </ListItem>
                        
                        {activeExports.indexOf(export_) < activeExports.length - 1 && (
                          <Divider />
                        )}
                      </React.Fragment>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          )}

          {exportError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {exportError}
            </Alert>
          )}

          {exporting && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Preparing export...
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={exporting}
          startIcon={getFormatIcon(exportFormat)}
        >
          {exporting ? 'Exporting...' : `Export ${exportFormat}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CommunicationExportPanel;