import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Chip,
  TextField
} from '@mui/material';
import {
  Download as DownloadIcon,
  Description as PdfIcon,
  TableChart as ExcelIcon,
  TextSnippet as CsvIcon
} from '@mui/icons-material';
import { useCommunicationAudit } from '../hooks/useCommunicationAudit';
import type { CommunicationAuditSearchRequest, ExportEstimation } from '../types/communicationAudit';

/**
 * Props for the CommunicationExportDialog component
 */
interface CommunicationExportDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog should be closed */
  onClose: () => void;
  /** Search criteria to include in export */
  searchCriteria: CommunicationAuditSearchRequest;
}

/**
 * Dialog for configuring and initiating communication data exports.
 * Supports CSV, Excel, and PDF formats with customizable options.
 * 
 * @component
 * @param {CommunicationExportDialogProps} props - Component props
 * @returns {JSX.Element} Export configuration dialog
 * 
 * @example
 * ```tsx
 * <CommunicationExportDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   searchCriteria={searchRequest}
 * />
 * ```
 * 
 * @since 3.4.0
 */
export const CommunicationExportDialog: React.FC<CommunicationExportDialogProps> = ({
  open,
  onClose,
  searchCriteria
}) => {
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [includeContent, setIncludeContent] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [maxRecords, setMaxRecords] = useState('10000');
  const [estimation, setEstimation] = useState<ExportEstimation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getExportEstimation, exportCommunications } = useCommunicationAudit();

  // Load export estimation when dialog opens
  useEffect(() => {
    if (open) {
      loadEstimation();
    }
  }, [open, searchCriteria]);

  /**
   * Loads size estimation for the export
   */
  const loadEstimation = async () => {
    try {
      setError(null);
      const estimationData = await getExportEstimation(searchCriteria);
      setEstimation(estimationData);

      // Auto-adjust format based on size
      if (estimationData.estimatedRecords > 50000) {
        setExportFormat('csv');
      } else if (estimationData.estimatedRecords > 10000) {
        setExportFormat('excel');
      }

      // Set reasonable max records limit
      if (estimationData.estimatedRecords > 10000) {
        setMaxRecords(Math.min(50000, estimationData.estimatedRecords).toString());
      } else {
        setMaxRecords(estimationData.estimatedRecords.toString());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load export estimation');
    }
  };

  /**
   * Handles the export process
   */
  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);

      const exportRequest = {
        searchCriteria,
        format: exportFormat,
        includeContent,
        includeMetadata,
        maxRecords: parseInt(maxRecords, 10)
      };

      await exportCommunications(exportRequest, exportFormat);
      
      // Close dialog after successful export
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gets format-specific icon and description
   */
  const getFormatInfo = (format: string) => {
    switch (format) {
      case 'csv':
        return {
          icon: <CsvIcon />,
          name: 'CSV',
          description: 'Comma-separated values file, compatible with Excel and data analysis tools'
        };
      case 'excel':
        return {
          icon: <ExcelIcon />,
          name: 'Excel',
          description: 'Microsoft Excel workbook with formatting, charts, and summary data'
        };
      case 'pdf':
        return {
          icon: <PdfIcon />,
          name: 'PDF',
          description: 'PDF compliance report with summary statistics and analysis'
        };
      default:
        return { icon: null, name: '', description: '' };
    }
  };

  /**
   * Validates the maximum records input
   */
  const isValidMaxRecords = () => {
    const value = parseInt(maxRecords, 10);
    return !isNaN(value) && value > 0 && value <= 100000;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Export Communication Data
      </DialogTitle>

      <DialogContent>
        {estimation && (
          <Card sx={{ mb: 3, bgcolor: 'info.50', borderColor: 'info.main', border: 1 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Export Estimation
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                <Chip 
                  label={`${estimation.estimatedRecords.toLocaleString()} records`} 
                  color="primary" 
                />
                <Chip 
                  label={`~${Math.round(estimation.estimatedSizeKB / 1024)} MB`} 
                  color="secondary" 
                />
                <Chip 
                  label={`~${estimation.estimatedProcessingMinutes} min`} 
                  color="default" 
                />
                {estimation.recommendedFormat && (
                  <Chip 
                    label={`Recommended: ${estimation.recommendedFormat}`} 
                    color="success" 
                  />
                )}
              </Box>
              {estimation.requiresAsyncProcessing && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Large export detected. Processing may take several minutes and will be downloaded automatically when complete.
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Format Selection */}
        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <FormLabel component="legend">
            <Typography variant="h6">Export Format</Typography>
          </FormLabel>
          <RadioGroup
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'csv' | 'excel' | 'pdf')}
          >
            {['csv', 'excel', 'pdf'].map((format) => {
              const info = getFormatInfo(format);
              return (
                <FormControlLabel
                  key={format}
                  value={format}
                  control={<Radio />}
                  label={
                    <Box display="flex" alignItems="center" sx={{ py: 1 }}>
                      <Box sx={{ mr: 1 }}>{info.icon}</Box>
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {info.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {info.description}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{ 
                    '& .MuiFormControlLabel-label': { width: '100%' },
                    mb: 1,
                    border: 1,
                    borderColor: exportFormat === format ? 'primary.main' : 'grey.300',
                    borderRadius: 1,
                    p: 1
                  }}
                />
              );
            })}
          </RadioGroup>
        </FormControl>

        {/* Export Options */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Export Options
          </Typography>
          
          <Box display="flex" flexDirection="column" gap={1}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeContent}
                  onChange={(e) => setIncludeContent(e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Include full message content</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Includes complete text of communications (increases file size)
                  </Typography>
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Include technical metadata</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Includes technical details like IP addresses, user agents, etc.
                  </Typography>
                </Box>
              }
            />
          </Box>
        </Box>

        {/* Record Limit */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Record Limit
          </Typography>
          <TextField
            fullWidth
            type="number"
            label="Maximum records to export"
            value={maxRecords}
            onChange={(e) => setMaxRecords(e.target.value)}
            error={!isValidMaxRecords()}
            helperText={
              !isValidMaxRecords() 
                ? 'Please enter a valid number between 1 and 100,000' 
                : `Export up to ${parseInt(maxRecords, 10).toLocaleString()} records`
            }
            inputProps={{ min: 1, max: 100000 }}
          />
        </Box>

        {/* Current Filters Summary */}
        {(searchCriteria.searchTerm || 
          searchCriteria.communicationType?.length ||
          searchCriteria.deliveryStatus?.length ||
          searchCriteria.dateFrom ||
          searchCriteria.dateTo) && (
          <Card sx={{ bgcolor: 'grey.50' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Applied Filters
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {searchCriteria.searchTerm && (
                  <Chip label={`Search: "${searchCriteria.searchTerm}"`} size="small" />
                )}
                {searchCriteria.communicationType?.map(type => (
                  <Chip key={type} label={`Type: ${type}`} size="small" />
                ))}
                {searchCriteria.deliveryStatus?.map(status => (
                  <Chip key={status} label={`Status: ${status}`} size="small" />
                ))}
                {searchCriteria.dateFrom && (
                  <Chip 
                    label={`From: ${new Date(searchCriteria.dateFrom).toLocaleDateString()}`} 
                    size="small" 
                  />
                )}
                {searchCriteria.dateTo && (
                  <Chip 
                    label={`To: ${new Date(searchCriteria.dateTo).toLocaleDateString()}`} 
                    size="small" 
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Progress indicator */}
        {loading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Preparing export...
            </Typography>
            <LinearProgress />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          startIcon={<DownloadIcon />}
          disabled={loading || !isValidMaxRecords()}
        >
          {loading ? 'Exporting...' : `Export ${getFormatInfo(exportFormat).name}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};