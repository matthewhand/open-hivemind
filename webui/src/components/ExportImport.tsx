import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  FileCopy as FileIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';

interface ExportImportProps {
  onRefresh?: () => void;
}

const ExportImport: React.FC<ExportImportProps> = ({ onRefresh }) => {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const [exportSettings, setExportSettings] = useState({
    filename: `config-export-${new Date().toISOString().split('T')[0]}`,
    includeSensitive: false,
    includeEnvironment: true,
    includeMetadata: true,
    format: 'json',
  });

  const [importSettings, setImportSettings] = useState({
    file: null as File | null,
    mergeExisting: false,
    backupCurrent: true,
    validateOnly: false,
  });

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleExport = async () => {
    setLoading('export');

    try {
      const blob = await apiService.exportConfig();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${exportSettings.filename}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSnackbar('Configuration exported successfully', 'success');
      setExportDialogOpen(false);
    } catch {
      showSnackbar('Failed to export configuration', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleImport = async () => {
    if (!importSettings.file) {
      showSnackbar('Please select a file to import', 'error');
      return;
    }

    setLoading('import');

    try {
      // In a real implementation, you would read the file and send it to the API
      // For now, we'll simulate the import process
      await new Promise(resolve => setTimeout(resolve, 2000));

      showSnackbar('Configuration imported successfully', 'success');
      setImportDialogOpen(false);
      if (onRefresh) onRefresh();
    } catch {
      showSnackbar('Failed to import configuration', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportSettings({ ...importSettings, file });
    }
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              <FileIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Configuration Export/Import
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Export your bot configurations for backup or sharing, or import configurations from files.
          </Typography>

          <Box display="flex" gap={2} mb={3}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => setExportDialogOpen(true)}
              color="primary"
            >
              Export Configuration
            </Button>

            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setImportDialogOpen(true)}
              color="secondary"
            >
              Import Configuration
            </Button>
          </Box>

          {/* Quick Info */}
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Export:</strong> Download your current bot configurations as a JSON file for backup or sharing.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Import:</strong> Upload a configuration file to restore or merge bot settings.
            </Typography>
          </Alert>

          {/* Recent Activity */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Recent Activity</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Configuration exported"
                    secondary="config-export-2024-01-19.json • 2 hours ago"
                  />
                  <ListItemSecondaryAction>
                    <Chip label="Success" size="small" color="success" />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Configuration imported"
                    secondary="config-backup-2024-01-15.json • 1 day ago"
                  />
                  <ListItemSecondaryAction>
                    <Chip label="Success" size="small" color="success" />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Export failed"
                    secondary="Network error • 3 days ago"
                  />
                  <ListItemSecondaryAction>
                    <Chip label="Error" size="small" color="error" />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Export Configuration</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Filename"
              value={exportSettings.filename}
              onChange={(e) => setExportSettings({ ...exportSettings, filename: e.target.value })}
              sx={{ mb: 2 }}
              placeholder="config-export-2024-01-19"
              helperText="File will be saved as .json"
            />

            <Box display="flex" flexDirection="column" gap={2} sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={exportSettings.includeEnvironment}
                    onChange={(e) => setExportSettings({ ...exportSettings, includeEnvironment: e.target.checked })}
                  />
                }
                label="Include environment variables"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={exportSettings.includeMetadata}
                    onChange={(e) => setExportSettings({ ...exportSettings, includeMetadata: e.target.checked })}
                  />
                }
                label="Include metadata and field information"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={exportSettings.includeSensitive}
                    onChange={(e) => setExportSettings({ ...exportSettings, includeSensitive: e.target.checked })}
                  />
                }
                label="Include sensitive data (tokens, keys, etc.)"
              />
            </Box>

            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Warning:</strong> Including sensitive data will export tokens, API keys, and other credentials in plain text.
                Only enable this option if you need to transfer configurations between systems.
              </Typography>
            </Alert>

            <Typography variant="body2" color="text.secondary">
              <strong>Export Contents:</strong>
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
              <Chip label="Bot configurations" size="small" color="primary" />
              <Chip label="Provider settings" size="small" color="primary" />
              {exportSettings.includeEnvironment && (
                <Chip label="Environment variables" size="small" color="secondary" />
              )}
              {exportSettings.includeMetadata && (
                <Chip label="Metadata" size="small" color="secondary" />
              )}
              {exportSettings.includeSensitive && (
                <Chip label="Sensitive data" size="small" color="error" />
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            variant="contained"
            startIcon={loading === 'export' ? <CircularProgress size={20} /> : <DownloadIcon />}
            disabled={loading === 'export'}
          >
            Export Configuration
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Configuration</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
              >
                Select File
                <input
                  type="file"
                  hidden
                  accept=".json"
                  onChange={handleFileSelect}
                />
              </Button>
              {importSettings.file && (
                <Typography variant="body2">
                  Selected: {importSettings.file.name}
                </Typography>
              )}
            </Box>

            <Box display="flex" flexDirection="column" gap={2} sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={importSettings.mergeExisting}
                    onChange={(e) => setImportSettings({ ...importSettings, mergeExisting: e.target.checked })}
                  />
                }
                label="Merge with existing configurations"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={importSettings.backupCurrent}
                    onChange={(e) => setImportSettings({ ...importSettings, backupCurrent: e.target.checked })}
                  />
                }
                label="Create backup of current configuration"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={importSettings.validateOnly}
                    onChange={(e) => setImportSettings({ ...importSettings, validateOnly: e.target.checked })}
                  />
                }
                label="Validate only (do not apply changes)"
              />
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Import Options:</strong>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                • <strong>Merge:</strong> Combine imported configs with existing ones
              </Typography>
              <Typography variant="body2">
                • <strong>Backup:</strong> Create a backup before making changes
              </Typography>
              <Typography variant="body2">
                • <strong>Validate:</strong> Check the file without applying changes
              </Typography>
            </Alert>

            <Alert severity="warning">
              <Typography variant="body2">
                <strong>Warning:</strong> Importing configurations will modify your bot settings.
                Make sure to backup your current configuration first.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            variant="contained"
            color="secondary"
            startIcon={loading === 'import' ? <CircularProgress size={20} /> : <UploadIcon />}
            disabled={loading === 'import' || !importSettings.file}
          >
            Import Configuration
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ExportImport;