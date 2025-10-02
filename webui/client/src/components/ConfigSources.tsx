import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Code as CodeIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import type { ConfigSourcesResponse } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const ConfigSources: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [configSources, setConfigSources] = useState<ConfigSourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [selectedEnvVar, setSelectedEnvVar] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchConfigSources();
  }, []);

  const fetchConfigSources = async () => {
    try {
      setError(null);
      const data = await apiService.getConfigSources();
      setConfigSources(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration sources');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleViewEnvVar = (envVar: string) => {
    setSelectedEnvVar(envVar);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedEnvVar(null);
  };

  const isSensitiveKey = (key: string) => {
    const sensitivePatterns = [
      'token', 'key', 'secret', 'password', 'auth', 'credential'
    ];
    return sensitivePatterns.some(pattern =>
      key.toLowerCase().includes(pattern)
    );
  };


  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading configuration sources...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={fetchConfigSources}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Configuration Sources
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {lastRefresh && (
                <Typography variant="body2" color="text.secondary">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </Typography>
              )}
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={fetchConfigSources}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            View and manage configuration sources including environment variables, config files, and overrides.
          </Typography>

          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Environment Variables" />
              <Tab label="Config Files" />
              <Tab label="Overrides" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            {configSources?.environmentVariables && Object.keys(configSources.environmentVariables).length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Variable</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell>Sensitive</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(configSources.environmentVariables).map(([key, value]) => (
                      <TableRow key={key} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontFamily="monospace" fontWeight="medium">
                              {key}
                            </Typography>
                            {isSensitiveKey(key) && <LockIcon fontSize="small" color="error" />}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.8rem' }}>
                            {isSensitiveKey(key) ? '••••••••' : (value?.value || 'Not set')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label="Environment"
                            size="small"
                            color="primary"
                            variant="outlined"
                            icon={<SettingsIcon />}
                          />
                        </TableCell>
                        <TableCell>
                          {isSensitiveKey(key) ? (
                            <Chip label="Yes" size="small" color="error" />
                          ) : (
                            <Chip label="No" size="small" color="success" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => handleViewEnvVar(key)}
                            disabled={isSensitiveKey(key)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">
                No environment variables found for bot configuration.
              </Alert>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {configSources?.configFiles && configSources.configFiles.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>File Name</TableCell>
                      <TableCell>Path</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Last Modified</TableCell>
                      <TableCell>Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {configSources.configFiles.map((file, index: number) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {file.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.8rem' }}>
                            {file.path}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatFileSize(file.size)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(file.modified)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={file.type.toUpperCase()}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">
                No configuration files found.
              </Alert>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {configSources?.overrides && configSources.overrides.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Key</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Bot</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Source</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {configSources.overrides.map((override, index: number) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace" fontWeight="medium">
                            {override.key}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.8rem' }}>
                            {isSensitiveKey(override.key) ? '••••••••' : (override.value || 'Not set')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {override.bot}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={override.type}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label="Override"
                            size="small"
                            color="warning"
                            icon={<CodeIcon />}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">
                No configuration overrides found.
              </Alert>
            )}
          </TabPanel>
        </CardContent>
      </Card>

      {/* Environment Variable Detail Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Environment Variable Details
        </DialogTitle>
        <DialogContent>
          {selectedEnvVar && configSources?.environmentVariables[selectedEnvVar] && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Variable: {selectedEnvVar}
              </Typography>

              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Details</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box display="flex" flexDirection="column" gap={2}>
                    <TextField
                      fullWidth
                      label="Key"
                      value={selectedEnvVar}
                      InputProps={{ readOnly: true }}
                    />

                    <TextField
                      fullWidth
                      label="Value"
                      value={configSources.environmentVariables[selectedEnvVar].value || ''}
                      InputProps={{ readOnly: true }}
                      multiline
                      rows={3}
                    />

                    <Box display="flex" gap={2}>
                      <TextField
                        fullWidth
                        label="Source"
                        value={configSources.environmentVariables[selectedEnvVar].source || 'unknown'}
                        InputProps={{ readOnly: true }}
                      />

                      <TextField
                        fullWidth
                        label="Sensitive"
                        value={isSensitiveKey(selectedEnvVar) ? 'Yes' : 'No'}
                        InputProps={{ readOnly: true }}
                      />
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ConfigSources;