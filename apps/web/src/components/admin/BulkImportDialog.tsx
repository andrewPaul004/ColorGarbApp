import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Collapse,
  IconButton,
  Divider,
  Paper,
} from '@mui/material';
import {
  CloudUpload,
  Download as DownloadIcon,
  ExpandMore,
  ExpandLess,
  CheckCircle,
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import organizationService, { type CreateOrganizationData, type BulkImportResult } from '../../services/organizationService';

/**
 * Props for BulkImportDialog component
 */
interface BulkImportDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback when import is completed successfully */
  onImportCompleted: (successCount: number) => void;
  /** Callback when an error occurs */
  onError: (error: string) => void;
}

/**
 * CSV parsing result interface
 */
interface ParsedCSVResult {
  organizations: CreateOrganizationData[];
  errors: string[];
}

/**
 * Bulk import dialog component for importing organizations from CSV.
 * Features CSV template download, file validation, and detailed import results.
 *
 * @component
 * @param {BulkImportDialogProps} props - Component props
 * @returns {JSX.Element} Bulk import dialog component
 *
 * @example
 * ```tsx
 * <BulkImportDialog
 *   open={isOpen}
 *   onClose={handleClose}
 *   onImportCompleted={handleCompleted}
 *   onError={handleError}
 * />
 * ```
 *
 * @since 2.5.0
 */
export const BulkImportDialog: React.FC<BulkImportDialogProps> = ({
  open,
  onClose,
  onImportCompleted,
  onError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CreateOrganizationData[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  /**
   * CSV template data
   */
  const csvTemplate = `Name,Type,ContactEmail,ContactPhone,Address,ShippingAddress
Lincoln High School,school,contact@lincoln.edu,(555) 123-4567,"123 Main St, Springfield, IL 62701",
Theater Company NYC,theater,info@theaternyc.com,(212) 555-0123,"456 Broadway, New York, NY 10013","789 Warehouse St, Brooklyn, NY 11201"
Dance Academy,dance_company,admin@danceacademy.com,,"321 Dance Ave, Los Angeles, CA 90210",`;

  /**
   * Reset dialog state when opening/closing
   */
  React.useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setParsedData([]);
      setParseErrors([]);
      setImportResult(null);
      setShowErrors(false);
    }
  }, [open]);

  /**
   * Download CSV template
   */
  const handleDownloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organization_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  /**
   * Parse CSV content
   */
  const parseCSV = (content: string): ParsedCSVResult => {
    const lines = content.split('\n').filter(line => line.trim());
    const errors: string[] = [];
    const organizations: CreateOrganizationData[] = [];

    if (lines.length < 2) {
      errors.push('CSV file must contain at least a header row and one data row');
      return { organizations, errors };
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const requiredHeaders = ['Name', 'Type', 'ContactEmail', 'Address'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
      errors.push(`Missing required columns: ${missingHeaders.join(', ')}`);
      return { organizations, errors };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        // Simple CSV parsing - would need more robust parsing for production
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Validate required fields
        const rowErrors: string[] = [];
        if (!row.Name?.trim()) rowErrors.push('Name is required');
        if (!row.Type?.trim()) rowErrors.push('Type is required');
        if (!row.ContactEmail?.trim()) rowErrors.push('ContactEmail is required');
        if (!row.Address?.trim()) rowErrors.push('Address is required');

        // Validate email format
        if (row.ContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.ContactEmail)) {
          rowErrors.push('ContactEmail must be a valid email address');
        }

        // Validate organization type
        const validTypes = ['school', 'theater', 'dance_company', 'other'];
        if (row.Type && !validTypes.includes(row.Type.toLowerCase())) {
          rowErrors.push(`Type must be one of: ${validTypes.join(', ')}`);
        }

        if (rowErrors.length > 0) {
          errors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`);
        } else {
          organizations.push({
            name: row.Name.trim(),
            type: row.Type.toLowerCase(),
            contactEmail: row.ContactEmail.trim(),
            contactPhone: row.ContactPhone?.trim() || undefined,
            address: row.Address.trim(),
            shippingAddress: row.ShippingAddress?.trim() || undefined,
          });
        }
      } catch {
        errors.push(`Row ${i + 1}: Failed to parse CSV data`);
      }
    }

    // Check for duplicates within the file
    const nameMap = new Map<string, number>();
    organizations.forEach((org, index) => {
      const lowerName = org.name.toLowerCase();
      if (nameMap.has(lowerName)) {
        errors.push(`Duplicate organization name "${org.name}" found in rows ${nameMap.get(lowerName)! + 2} and ${index + 2}`);
      } else {
        nameMap.set(lowerName, index);
      }
    });

    return { organizations, errors };
  };

  /**
   * Handle file input change
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      onError('Please select a CSV file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      onError('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);

    // Parse the file
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseCSV(content);
      setParsedData(result.organizations);
      setParseErrors(result.errors);
    };
    reader.onerror = () => {
      onError('Failed to read the selected file');
    };
    reader.readAsText(file);

    // Reset input
    event.target.value = '';
  };

  /**
   * Handle import execution
   */
  const handleImport = async () => {
    if (parsedData.length === 0) return;

    try {
      setImporting(true);
      const result = await organizationService.bulkImportOrganizations(parsedData);
      setImportResult(result);

      if (result.successCount > 0) {
        onImportCompleted(result.successCount);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    if (!importing) {
      onClose();
    }
  };

  /**
   * Toggle error details visibility
   */
  const toggleErrorDetails = () => {
    setShowErrors(!showErrors);
  };

  const hasErrors = parseErrors.length > 0;
  const canImport = parsedData.length > 0 && !hasErrors && !importing;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle>
          <Typography variant="h6">Bulk Import Organizations</Typography>
        </DialogTitle>

        <DialogContent dividers>
          {!importResult ? (
            <>
              {/* Instructions */}
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Import multiple organizations from a CSV file. Maximum 1000 organizations per import.
                </Typography>
                <Button
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadTemplate}
                >
                  Download CSV Template
                </Button>
              </Alert>

              {/* File Selection */}
              <Box sx={{ mb: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<CloudUpload />}
                  onClick={handleFileSelect}
                  fullWidth
                  sx={{ py: 2 }}
                >
                  {selectedFile ? `Selected: ${selectedFile.name}` : 'Select CSV File'}
                </Button>
              </Box>

              {/* Parsing Errors */}
              {hasErrors && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Typography variant="body2">
                      {parseErrors.length} error(s) found in CSV file
                    </Typography>
                    <IconButton size="small" onClick={toggleErrorDetails}>
                      {showErrors ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                  <Collapse in={showErrors}>
                    <List dense>
                      {parseErrors.map((error, index) => (
                        <ListItem key={index} sx={{ pl: 0 }}>
                          <ListItemText
                            primary={error}
                            sx={{ '& .MuiListItemText-primary': { fontSize: '0.875rem' } }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </Alert>
              )}

              {/* Parsed Data Summary */}
              {parsedData.length > 0 && !hasErrors && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    Ready to import {parsedData.length} organization(s)
                  </Typography>
                  <List dense>
                    {parsedData.slice(0, 5).map((org, index) => (
                      <ListItem key={index} sx={{ pl: 0 }}>
                        <ListItemText
                          primary={`${org.name} (${org.type})`}
                          secondary={org.contactEmail}
                          sx={{ '& .MuiListItemText-primary': { fontSize: '0.875rem' } }}
                        />
                      </ListItem>
                    ))}
                    {parsedData.length > 5 && (
                      <ListItem sx={{ pl: 0 }}>
                        <ListItemText
                          primary={`... and ${parsedData.length - 5} more`}
                          sx={{ '& .MuiListItemText-primary': { fontSize: '0.875rem', fontStyle: 'italic' } }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Alert>
              )}

              {/* Import Progress */}
              {importing && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Importing organizations...
                  </Typography>
                  <LinearProgress />
                </Box>
              )}
            </>
          ) : (
            /* Import Results */
            <Box>
              <Paper sx={{ p: 2, mb: 3, bgcolor: 'success.light', color: 'success.contrastText' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckCircle sx={{ mr: 1 }} />
                  <Typography variant="h6">Import Completed</Typography>
                </Box>
                <Typography variant="body2">
                  {importResult.successCount} organizations imported successfully
                  {importResult.failureCount > 0 && `, ${importResult.failureCount} failed`}
                </Typography>
                <Typography variant="caption">
                  Processing time: {(importResult.processingTime / 1000).toFixed(2)} seconds
                </Typography>
              </Paper>

              {/* Import Failures */}
              {importResult.failures.length > 0 && (
                <Alert severity="warning">
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Typography variant="body2">
                      {importResult.failures.length} organization(s) failed to import
                    </Typography>
                    <IconButton size="small" onClick={toggleErrorDetails}>
                      {showErrors ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                  <Collapse in={showErrors}>
                    <List dense>
                      {importResult.failures.map((failure, index) => (
                        <ListItem key={index} sx={{ pl: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
                          <ListItemText
                            primary={`Row ${failure.rowNumber}: ${failure.organizationName}`}
                            secondary={failure.error}
                            sx={{ '& .MuiListItemText-primary': { fontSize: '0.875rem', fontWeight: 600 } }}
                          />
                          {failure.validationErrors.length > 0 && (
                            <Box sx={{ mt: 1, pl: 2 }}>
                              {failure.validationErrors.map((validationError, vIndex) => (
                                <Typography key={vIndex} variant="caption" color="error" sx={{ display: 'block' }}>
                                  • {validationError}
                                </Typography>
                              ))}
                            </Box>
                          )}
                          {index < importResult.failures.length - 1 && <Divider sx={{ mt: 1, width: '100%' }} />}
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} disabled={importing}>
            {importResult ? 'Close' : 'Cancel'}
          </Button>
          {!importResult && (
            <LoadingButton
              onClick={handleImport}
              variant="contained"
              loading={importing}
              disabled={!canImport}
            >
              Import Organizations
            </LoadingButton>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};