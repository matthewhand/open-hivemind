import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  LinkOff as LinkOffIcon,
  Refresh as RefreshIcon,
  Build as BuildIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

interface MCPServer {
  name: string;
  serverUrl: string;
  apiKey?: string;
  connected: boolean;
  tools?: unknown[];
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: unknown;
}

const MCPServerManager: React.FC = () => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [toolsDialogOpen, setToolsDialogOpen] = useState(false);
  const [serverTools, setServerTools] = useState<MCPTool[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    serverUrl: '',
    apiKey: '',
  });

  const fetchServers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the admin API endpoint for MCP servers
      const response = await fetch('/api/admin/mcp-servers');
      if (!response.ok) {
        throw new Error('Failed to fetch MCP servers');
      }
      const data = await response.json();

      const serverList: MCPServer[] = [];
      if (data.servers) {
        Object.entries(data.servers).forEach(([name, server]: [string, unknown]) => {
          const serverObj = server as { serverUrl?: string; apiKey?: string };
          serverList.push({
            name,
            serverUrl: serverObj.serverUrl || '',
            apiKey: serverObj.apiKey || '',
            connected: true,
          });
        });
      }

      // Add configured servers that might not be connected
      if (data.configurations) {
        data.configurations.forEach((config: unknown) => {
          const configObj = config as { name?: string; serverUrl?: string; apiKey?: string };
          const existing = serverList.find(s => s.name === configObj.name);
          if (!existing && configObj.name) {
            serverList.push({
              name: configObj.name,
              serverUrl: configObj.serverUrl || '',
              apiKey: configObj.apiKey || '',
              connected: false,
            });
          }
        });
      }

      setServers(serverList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch MCP servers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleConnectServer = async () => {
    try {
      const response = await fetch('/api/admin/mcp-servers/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to connect to MCP server');
      }

      setSnackbar({ open: true, message: 'MCP server connected successfully', severity: 'success' });
      setConnectDialogOpen(false);
      setFormData({ name: '', serverUrl: '', apiKey: '' });
      fetchServers();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to connect to MCP server',
        severity: 'error'
      });
    }
  };

  const handleDisconnectServer = async (serverName: string) => {
    if (!confirm(`Are you sure you want to disconnect from MCP server "${serverName}"?`)) return;

    try {
      const response = await fetch('/api/admin/mcp-servers/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: serverName }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect from MCP server');
      }

      setSnackbar({ open: true, message: 'MCP server disconnected successfully', severity: 'success' });
      fetchServers();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to disconnect from MCP server',
        severity: 'error'
      });
    }
  };

  const handleViewTools = async (server: MCPServer) => {
    setSelectedServer(server);
    try {
      const response = await fetch(`/api/admin/mcp-servers/${server.name}/tools`);
      if (!response.ok) {
        throw new Error('Failed to fetch tools');
      }
      const data = await response.json();
      setServerTools(data.tools || []);
      setToolsDialogOpen(true);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to fetch tools',
        severity: 'error'
      });
    }
  };

  const openConnectDialog = () => {
    setFormData({ name: '', serverUrl: '', apiKey: '' });
    setConnectDialogOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          MCP Server Management
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchServers}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openConnectDialog}
          >
            Connect Server
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box>
        {servers.map((server) => (
          <Accordion key={server.name} sx={{ mb: 2 }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Box display="flex" alignItems="center" gap={2} width="100%">
                <BuildIcon color="primary" />
                <Box flex={1}>
                  <Typography variant="h6" component="div">
                    {server.name}
                  </Typography>
                  <Box display="flex" gap={1} mt={1}>
                    <Chip
                      label={server.connected ? 'Connected' : 'Disconnected'}
                      color={server.connected ? 'success' : 'default'}
                      size="small"
                    />
                    <Typography variant="body2" color="text.secondary" fontFamily="monospace">
                      {server.serverUrl}
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" gap={1}>
                  {server.connected && (
                    <Tooltip title="View Tools">
                      <IconButton
                        size="small"
                        onClick={() => handleViewTools(server)}
                      >
                        <BuildIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Disconnect">
                    <IconButton
                      size="small"
                      onClick={() => handleDisconnectServer(server.name)}
                      color="error"
                    >
                      <LinkOffIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Server Details
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Typography variant="body2">
                      <strong>Server URL:</strong> {server.serverUrl}
                    </Typography>
                    <Typography variant="body2">
                      <strong>API Key:</strong> {server.apiKey ? '••••••••' : 'None'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Status:</strong> {server.connected ? 'Connected' : 'Disconnected'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Connect Server Dialog */}
      <Dialog open={connectDialogOpen} onClose={() => setConnectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Connect to MCP Server</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Server Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Server URL"
              value={formData.serverUrl}
              onChange={(e) => setFormData({ ...formData, serverUrl: e.target.value })}
              required
              helperText="The URL of the MCP server"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="API Key (Optional)"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              type="password"
              helperText="API key for server authentication (if required)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConnectServer} variant="contained">
            Connect Server
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tools Dialog */}
      <Dialog
        open={toolsDialogOpen}
        onClose={() => setToolsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Tools - {selectedServer?.name}
        </DialogTitle>
        <DialogContent>
          {serverTools.length > 0 ? (
            <List>
              {serverTools.map((tool, index) => (
                <React.Fragment key={tool.name}>
                  <ListItem>
                    <ListItemIcon>
                      <BuildIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={tool.name}
                      secondary={tool.description}
                    />
                  </ListItem>
                  {index < serverTools.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No tools available for this server.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToolsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
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

export default MCPServerManager;