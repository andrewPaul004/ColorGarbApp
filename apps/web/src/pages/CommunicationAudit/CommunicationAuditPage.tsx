import React, { useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Button,
  Paper,
  useTheme
} from '@mui/material';
import {
  Search as SearchIcon,
  Assessment as DashboardIcon,
  FileDownload as ExportIcon,
  History as AuditIcon
} from '@mui/icons-material';
import { Breadcrumb, type BreadcrumbItem } from '../../components/common/Breadcrumb';
import { CommunicationAuditLog } from '../../components/communication/CommunicationAuditLog';
import { CommunicationAuditSearch } from '../../components/communication/CommunicationAuditSearch';
import { CommunicationExportPanel } from '../../components/communication/CommunicationExportPanel';
import { ComplianceReportingDashboard } from '../../components/communication/ComplianceReportingDashboard';
import type { 
  CommunicationAuditSearchRequest,
  CommunicationLog 
} from '../../types/shared';
import { useAppStore } from '../../stores/appStore';

/**
 * Communication audit trail page with search, reporting, and export capabilities.
 * Provides comprehensive view of all organizational communications with compliance features.
 * 
 * @component
 * @since 3.4.0
 */
export const CommunicationAuditPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAppStore();
  const [currentTab, setCurrentTab] = useState(0);
  const [searchCriteria, setSearchCriteria] = useState<CommunicationAuditSearchRequest>({
    organizationId: user?.organizationId,
    page: 1,
    pageSize: 25,
    sortBy: 'sentAt',
    sortDirection: 'desc'
  });
  const [exportPanelOpen, setExportPanelOpen] = useState(false);
  const [selectedCommunication, setSelectedCommunication] = useState<CommunicationLog | null>(null);

  /**
   * Handle search criteria changes
   */
  const handleSearchChange = useCallback((criteria: CommunicationAuditSearchRequest) => {
    setSearchCriteria({
      ...criteria,
      organizationId: user?.organizationId || criteria.organizationId
    });
  }, [user?.organizationId]);

  /**
   * Handle tab change
   */
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  /**
   * Handle communication selection
   */
  const handleCommunicationSelect = (communication: CommunicationLog) => {
    setSelectedCommunication(communication);
    // Could open a detail modal or navigate to detail view
    console.log('Selected communication:', communication);
  };

  /**
   * Breadcrumb configuration
   */
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Communication Audit', href: '/communication-audit' }
  ];

  /**
   * Tab panel component
   */
  const TabPanel: React.FC<{ children?: React.ReactNode; index: number; value: number }> = ({
    children,
    value,
    index
  }) => (
    <div hidden={value !== index} style={{ width: '100%' }}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Communication Audit Trail
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor, search, and analyze all communication delivery status for compliance and performance tracking.
        </Typography>
      </Box>

      {/* Tab Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            sx={{ 
              '& .MuiTabs-indicator': {
                backgroundColor: theme.palette.primary.main
              }
            }}
          >
            <Tab 
              icon={<AuditIcon />} 
              label="Audit Log" 
              iconPosition="start"
            />
            <Tab 
              icon={<DashboardIcon />} 
              label="Dashboard" 
              iconPosition="start"
            />
          </Tabs>

          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={() => setExportPanelOpen(true)}
            sx={{ ml: 2 }}
          >
            Export Data
          </Button>
        </Box>
      </Paper>

      {/* Tab Content */}
      <TabPanel value={currentTab} index={0}>
        {/* Audit Log Tab */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Search Interface */}
          <CommunicationAuditSearch
            initialCriteria={searchCriteria}
            onSearchChange={handleSearchChange}
            showOrganizationFilter={user?.role === 'colorgarb_staff'}
            loading={false}
          />

          {/* Audit Log Table */}
          <CommunicationAuditLog
            searchCriteria={searchCriteria}
            showOrderColumn={!searchCriteria.orderId}
            maxHeight={600}
            onCommunicationSelect={handleCommunicationSelect}
          />
        </Box>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        {/* Dashboard Tab */}
        {user?.organizationId ? (
          <ComplianceReportingDashboard
            organizationId={user.organizationId}
            defaultDateRange={30}
          />
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Dashboard Not Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Organization context required to display compliance dashboard.
              {user?.role === 'colorgarb_staff' && ' Please select an organization from the search filters.'}
            </Typography>
          </Box>
        )}
      </TabPanel>

      {/* Export Panel Dialog */}
      <CommunicationExportPanel
        open={exportPanelOpen}
        onClose={() => setExportPanelOpen(false)}
        searchCriteria={searchCriteria}
        organizationId={user?.organizationId}
      />

      {/* Communication Detail Modal/Drawer could be added here */}
      {selectedCommunication && (
        // Future: Add detailed communication view
        <></>
      )}
    </Container>
  );
};

export default CommunicationAuditPage;