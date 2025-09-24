import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  GetApp as DownloadIcon,
  Description as DocIcon,
  Code as ApiIcon,
} from '@mui/icons-material';

const ExportPage: React.FC = () => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const handleDownloadOpenAPI = async (format: 'json' | 'yaml') => {
    try {
      const response = await fetch(`/webui/api/openapi.${format}`);
      if (!response.ok) {
        throw new Error('Failed to download OpenAPI spec');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openapi-spec.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSnackbar({ open: true, message: `OpenAPI ${format.toUpperCase()} spec downloaded successfully`, severity: 'success' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to download OpenAPI spec',
        severity: 'error'
      });
    }
  };

  const exportOptions = [
    {
      title: 'OpenAPI JSON',
      description: 'Download the complete API specification in JSON format',
      icon: <ApiIcon />,
      action: () => handleDownloadOpenAPI('json'),
    },
    {
      title: 'OpenAPI YAML',
      description: 'Download the complete API specification in YAML format',
      icon: <DocIcon />,
      action: () => handleDownloadOpenAPI('yaml'),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Export & Documentation
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Download API specifications and system documentation for integration and development.
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          API Specifications
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Export the OpenAPI specification for the Open-Hivemind WebUI API endpoints.
        </Typography>

        <List>
          {exportOptions.map((option, index) => (
            <ListItem key={index} sx={{ px: 0 }}>
              <ListItemIcon>
                {option.icon}
              </ListItemIcon>
              <ListItemText
                primary={option.title}
                secondary={option.description}
              />
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={option.action}
                sx={{ ml: 2 }}
              >
                Download
              </Button>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ExportPage;