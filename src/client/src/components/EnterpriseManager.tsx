import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Cloud as CloudIcon,
  Analytics as AnalyticsIcon,
  IntegrationInstructions as IntegrationIcon,
  Gavel as GovernanceIcon,
  Speed as PerformanceIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'compliant' | 'non-compliant' | 'checking';
  lastChecked: string;
  remediation?: string;
}

interface CloudProvider {
  id: string;
  name: string;
  type: 'aws' | 'azure' | 'gcp' | 'digitalocean' | 'heroku';
  region: string;
  status: 'connected' | 'disconnected' | 'configuring';
  resources: Array<{
    type: string;
    count: number;
    status: string;
  }>;
}

interface Integration {
  id: string;
  name: string;
  type: 'webhook' | 'api' | 'database' | 'monitoring' | 'logging';
  provider: string;
  status: 'active' | 'inactive' | 'error';
  lastSync: string;
  config: Record<string, any>;
}

interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  result: 'success' | 'failure' | 'warning';
  details: string;
  ipAddress: string;
}

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
}

const EnterpriseManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>([]);
  const [cloudProviders, setCloudProviders] = useState<CloudProvider[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [addIntegrationDialog, setAddIntegrationDialog] = useState(false);
  const [addCloudProviderDialog, setAddCloudProviderDialog] = useState(false);

  // Form data
  const [integrationForm, setIntegrationForm] = useState({
    name: '',
    type: 'webhook' as Integration['type'],
    provider: '',
    config: {} as Record<string, any>
  });

  const [cloudForm, setCloudForm] = useState({
    name: '',
    type: 'aws' as CloudProvider['type'],
    region: '',
    credentials: {} as Record<string, any>
  });

  useEffect(() => {
    loadEnterpriseData();
  }, []);

  const loadEnterpriseData = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from APIs
      // For now, we'll simulate enterprise data

      const mockComplianceRules: ComplianceRule[] = [
        {
          id: 'rule_1',
          name: 'Data Encryption at Rest',
          description: 'All sensitive data must be encrypted at rest',
          category: 'Security',
          severity: 'high',
          status: 'compliant',
          lastChecked: '2024-01-15T10:30:00Z'
        },
        {
          id: 'rule_2',
          name: 'Access Control',
          description: 'Role-based access control must be enforced',
          category: 'Security',
          severity: 'critical',
          status: 'compliant',
          lastChecked: '2024-01-15T10:30:00Z'
        },
        {
          id: 'rule_3',
          name: 'Audit Logging',
          description: 'All administrative actions must be logged',
          category: 'Compliance',
          severity: 'medium',
          status: 'non-compliant',
          lastChecked: '2024-01-15T10:30:00Z',
          remediation: 'Enable audit logging for all admin operations'
        }
      ];

      const mockCloudProviders: CloudProvider[] = [
        {
          id: 'aws_prod',
          name: 'AWS Production',
          type: 'aws',
          region: 'us-east-1',
          status: 'connected',
          resources: [
            { type: 'EC2', count: 3, status: 'running' },
            { type: 'RDS', count: 1, status: 'running' },
            { type: 'S3', count: 2, status: 'active' }
          ]
        },
        {
          id: 'azure_dev',
          name: 'Azure Development',
          type: 'azure',
          region: 'East US',
          status: 'connected',
          resources: [
            { type: 'VM', count: 2, status: 'running' },
            { type: 'Database', count: 1, status: 'running' }
          ]
        }
      ];

      const mockIntegrations: Integration[] = [
        {
          id: 'int_1',
          name: 'Slack Notifications',
          type: 'webhook',
          provider: 'Slack',
          status: 'active',
          lastSync: '2024-01-15T10:30:00Z',
          config: { webhookUrl: 'https://hooks.slack.com/...' }
        },
        {
          id: 'int_2',
          name: 'Datadog Monitoring',
          type: 'monitoring',
          provider: 'Datadog',
          status: 'active',
          lastSync: '2024-01-15T10:25:00Z',
          config: { apiKey: '***', appKey: '***' }
        },
        {
          id: 'int_3',
          name: 'PostgreSQL Database',
          type: 'database',
          provider: 'PostgreSQL',
          status: 'active',
          lastSync: '2024-01-15T10:20:00Z',
          config: { host: 'db.example.com', database: 'open_hivemind' }
        }
      ];

      const mockAuditEvents: AuditEvent[] = [
        {
          id: 'audit_1',
          timestamp: '2024-01-15T10:30:00Z',
          user: 'admin@example.com',
          action: 'CREATE_BOT',
          resource: 'bots/myBot',
          result: 'success',
          details: 'Created new bot instance',
          ipAddress: '192.168.1.100'
        },
        {
          id: 'audit_2',
          timestamp: '2024-01-15T10:25:00Z',
          user: 'user@example.com',
          action: 'UPDATE_CONFIG',
          resource: 'config/production',
          result: 'success',
          details: 'Updated LLM provider configuration',
          ipAddress: '192.168.1.101'
        }
      ];

      const mockPerformanceMetrics: PerformanceMetric[] = [
        {
          id: 'metric_1',
          name: 'API Response Time',
          value: 245,
          unit: 'ms',
          trend: 'down',
          threshold: 500,
          status: 'normal'
        },
        {
          id: 'metric_2',
          name: 'Memory Usage',
          value: 78,
          unit: '%',
          trend: 'up',
          threshold: 90,
          status: 'warning'
        },
        {
          id: 'metric_3',
          name: 'Error Rate',
          value: 0.5,
          unit: '%',
          trend: 'stable',
          threshold: 5,
          status: 'normal'
        }
      ];

      setComplianceRules(mockComplianceRules);
      setCloudProviders(mockCloudProviders);
      setIntegrations(mockIntegrations);
      setAuditEvents(mockAuditEvents);
      setPerformanceMetrics(mockPerformanceMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load enterprise data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIntegration = async () => {
    if (!integrationForm.name.trim() || !integrationForm.provider.trim()) {
      setError('Integration name and provider are required');
      return;
    }

    try {
      setLoading(true);
      // In a real implementation, this would create the integration via API
      const newIntegration: Integration = {
        id: `int_${Date.now()}`,
        name: integrationForm.name,
        type: integrationForm.type,
        provider: integrationForm.provider,
        status: 'active',
        lastSync: new Date().toISOString(),
        config: integrationForm.config
      };

      setIntegrations(prev => [...prev, newIntegration]);
      setSuccess('Integration added successfully!');
      setAddIntegrationDialog(false);
      setIntegrationForm({ name: '', type: 'webhook', provider: '', config: {} });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add integration');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCloudProvider = async () => {
    if (!cloudForm.name.trim() || !cloudForm.region.trim()) {
      setError('Cloud provider name and region are required');
      return;
    }

    try {
      setLoading(true);
      // In a real implementation, this would configure the cloud provider
      const newProvider: CloudProvider = {
        id: `${cloudForm.type}_${Date.now()}`,
        name: cloudForm.name,
        type: cloudForm.type,
        region: cloudForm.region,
        status: 'configuring',
        resources: []
      };

      setCloudProviders(prev => [...prev, newProvider]);
      setSuccess('Cloud provider added successfully!');
      setAddCloudProviderDialog(false);
      setCloudForm({ name: '', type: 'aws', region: '', credentials: {} });

      // Simulate configuration completion
      setTimeout(() => {
        setCloudProviders(prev =>
          prev.map(provider =>
            provider.id === newProvider.id
              ? { ...provider, status: 'connected' as const }
              : provider
          )
        );
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add cloud provider');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'connected':
      case 'compliant':
        return 'success';
      case 'inactive':
      case 'disconnected':
      case 'non-compliant':
        return 'error';
      case 'configuring':
      case 'checking':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Security & Compliance
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Compliance Rules
            </Typography>
            <Grid container spacing={3}>
              {complianceRules.map((rule) => (
                <Grid item xs={12} md={6} lg={4} key={rule.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box>
                          <Typography variant="h6" component="h2">
                            {rule.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {rule.category}
                          </Typography>
                        </Box>
                        <Box display="flex" gap={1}>
                          <Chip
                            label={rule.severity}
                            color={getSeverityColor(rule.severity)}
                            size="small"
                          />
                          <Chip
                            label={rule.status}
                            color={getStatusColor(rule.status)}
                            size="small"
                          />
                        </Box>
                      </Box>
                      <Typography variant="body2" mb={2}>
                        {rule.description}
                      </Typography>
                      {rule.remediation && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            {rule.remediation}
                          </Typography>
                        </Alert>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Last checked: {new Date(rule.lastChecked).toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      case 1: // Multi-Cloud
        return (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                Cloud Providers
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddCloudProviderDialog(true)}
                disabled={loading}
              >
                Add Provider
              </Button>
            </Box>
            <Grid container spacing={3}>
              {cloudProviders.map((provider) => (
                <Grid item xs={12} md={6} key={provider.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box>
                          <Typography variant="h6" component="h2">
                            {provider.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {provider.type.toUpperCase()} • {provider.region}
                          </Typography>
                        </Box>
                        <Chip
                          label={provider.status}
                          color={getStatusColor(provider.status)}
                        />
                      </Box>
                      <Typography variant="body2" gutterBottom>
                        Resources:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {provider.resources.map((resource, index) => (
                          <Chip
                            key={index}
                            label={`${resource.type}: ${resource.count}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      case 2: // Integrations
        return (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                Enterprise Integrations
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddIntegrationDialog(true)}
                disabled={loading}
              >
                Add Integration
              </Button>
            </Box>
            <Grid container spacing={3}>
              {integrations.map((integration) => (
                <Grid item xs={12} md={6} lg={4} key={integration.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box>
                          <Typography variant="h6" component="h2">
                            {integration.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {integration.provider} • {integration.type}
                          </Typography>
                        </Box>
                        <Chip
                          label={integration.status}
                          color={getStatusColor(integration.status)}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" mb={1}>
                        Last sync: {new Date(integration.lastSync).toLocaleString()}
                      </Typography>
                      <Box display="flex" gap={1}>
                        <Button size="small" variant="outlined">
                          Configure
                        </Button>
                        <Button size="small" variant="outlined">
                          Test
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      case 3: // Audit & Governance
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Audit Events
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Resource</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>IP Address</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{new Date(event.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{event.user}</TableCell>
                      <TableCell>{event.action}</TableCell>
                      <TableCell>{event.resource}</TableCell>
                      <TableCell>
                        <Chip
                          label={event.result}
                          color={getStatusColor(event.result)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{event.ipAddress}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );

      case 4: // Performance Optimization
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <Grid container spacing={3}>
              {performanceMetrics.map((metric) => (
                <Grid item xs={12} md={6} lg={4} key={metric.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Typography variant="h6" component="h2">
                          {metric.name}
                        </Typography>
                        <Chip
                          label={metric.status}
                          color={getStatusColor(metric.status)}
                          size="small"
                        />
                      </Box>
                      <Typography variant="h4" component="p" sx={{ mb: 1 }}>
                        {metric.value} {metric.unit}
                      </Typography>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                          Threshold: {metric.threshold} {metric.unit}
                        </Typography>
                        {metric.trend === 'up' && <Typography color="error">↗</Typography>}
                        {metric.trend === 'down' && <Typography color="success">↘</Typography>}
                        {metric.trend === 'stable' && <Typography color="text.secondary">→</Typography>}
                      </Box>
                      <Button size="small" variant="outlined">
                        Optimize
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Enterprise Manager
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadEnterpriseData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            icon={<SecurityIcon />}
            label="Security & Compliance"
            iconPosition="start"
          />
          <Tab
            icon={<CloudIcon />}
            label="Multi-Cloud"
            iconPosition="start"
          />
          <Tab
            icon={<IntegrationIcon />}
            label="Integrations"
            iconPosition="start"
          />
          <Tab
            icon={<GovernanceIcon />}
            label="Audit & Governance"
            iconPosition="start"
          />
          <Tab
            icon={<PerformanceIcon />}
            label="Performance"
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Add Integration Dialog */}
      <Dialog open={addIntegrationDialog} onClose={() => setAddIntegrationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Integration</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Integration Name"
            value={integrationForm.name}
            onChange={(e) => setIntegrationForm(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
            required
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={integrationForm.type}
              onChange={(e) => setIntegrationForm(prev => ({ ...prev, type: e.target.value as Integration['type'] }))}
            >
              <MenuItem value="webhook">Webhook</MenuItem>
              <MenuItem value="api">API</MenuItem>
              <MenuItem value="database">Database</MenuItem>
              <MenuItem value="monitoring">Monitoring</MenuItem>
              <MenuItem value="logging">Logging</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Provider"
            value={integrationForm.provider}
            onChange={(e) => setIntegrationForm(prev => ({ ...prev, provider: e.target.value }))}
            sx={{ mb: 2 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddIntegrationDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAddIntegration}
            variant="contained"
            disabled={loading || !integrationForm.name.trim() || !integrationForm.provider.trim()}
          >
            {loading ? 'Adding...' : 'Add Integration'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Cloud Provider Dialog */}
      <Dialog open={addCloudProviderDialog} onClose={() => setAddCloudProviderDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Cloud Provider</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Provider Name"
            value={cloudForm.name}
            onChange={(e) => setCloudForm(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
            required
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Cloud Type</InputLabel>
            <Select
              value={cloudForm.type}
              onChange={(e) => setCloudForm(prev => ({ ...prev, type: e.target.value as CloudProvider['type'] }))}
            >
              <MenuItem value="aws">Amazon Web Services</MenuItem>
              <MenuItem value="azure">Microsoft Azure</MenuItem>
              <MenuItem value="gcp">Google Cloud Platform</MenuItem>
              <MenuItem value="digitalocean">DigitalOcean</MenuItem>
              <MenuItem value="heroku">Heroku</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Region"
            value={cloudForm.region}
            onChange={(e) => setCloudForm(prev => ({ ...prev, region: e.target.value }))}
            sx={{ mb: 2 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddCloudProviderDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAddCloudProvider}
            variant="contained"
            disabled={loading || !cloudForm.name.trim() || !cloudForm.region.trim()}
          >
            {loading ? 'Adding...' : 'Add Provider'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EnterpriseManager;