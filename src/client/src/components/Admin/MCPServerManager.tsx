import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Paper, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  IconButton,
  Snackbar,
  Alert,
  Chip,
  Card,
  CardContent,
  Grid,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Build as BuildIcon,
  Link as LinkIcon,
  Code as CodeIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

interface MCPServer {
  name: string;
  url: string;
  apiKey?: string;
  connected: boolean;
  tools?: Array<{
    name: string;
    description: string;
    inputSchema: any;
  }>;
  lastConnected?: string;
  error?: string;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  serverName: string;
}

const MCPServerManager: React.FC = () => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openToolDialog, setOpenToolDialog] = useState(false);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [toolTestArgs, setToolTestArgs] = useState<string>('{}');
  const [currentTab, setCurrentTab] = useState(0);
  
  const [newServer, setNewServer] = useState({ 
    name: '', 
    url: '', 
    apiKey: '' 
  });
  
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });
  
  const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({});

  const fetchServers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/mcp/servers');
      const data = await response.json();
      setServers(data.servers || []);
    } catch (err) {
      setError('Failed to fetch MCP servers');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleOpenDialog = () => {
    setNewServer({ name: '', serverUrl: '', apiKey: '' });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleConnectServer = async () => {
    try {
      const response = await fetch('/api/admin/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newServer)
      });
      
      if (!response.ok) throw new Error('Failed to add server');
      
      setSnackbar({ open: true, message: 'MCP server added successfully', severity: 'success' });
      handleCloseDialog();
      fetchServers();
    } catch (error) {
      setSnackbar({ open: true, message: 'Error adding MCP server', severity: 'error' });
    }
  };

  const handleConnect = async (serverName: string) => {
    try {
      const response = await fetch(`/api/admin/mcp/servers/${serverName}/connect`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to connect to server');
      
      setSnackbar({ open: true, message: 'MCP server connected successfully', severity: 'success' });
      fetchServers();
    } catch (error) {
      setSnackbar({ open: true, message: 'Error connecting to MCP server', severity: 'error' });
    }
  };

  const handleDisconnect = async (serverName: string) => {
    try {
      const response = await fetch(`/api/admin/mcp/servers/${serverName}/disconnect`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to disconnect from server');
      
      setSnackbar({ open: true, message: 'MCP server disconnected successfully', severity: 'success' });
      fetchServers();
    } catch (error) {
      setSnackbar({ open: true, message: 'Error disconnecting from MCP server', severity: 'error' });
    }
  };

  const handleDeleteServer = async (serverName: string) => {
    if (!confirm(`Are you sure you want to delete the MCP server "${serverName}"?`)) return;
    
    try {
      const response = await fetch(`/api/admin/mcp/servers/${serverName}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete server');
      
      setSnackbar({ open: true, message: 'MCP server deleted successfully', severity: 'success' });
      fetchServers();
    } catch (error) {
      setSnackbar({ open: true, message: 'Error deleting MCP server', severity: 'error' });
    }
  };

  const handleTestTool = async () => {
    if (!selectedTool) return;
    
    try {
      const args = JSON.parse(toolTestArgs);
      const response = await fetch(`/api/admin/mcp/servers/${selectedTool.serverName}/call-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: selectedTool.name,
          arguments: args
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error || 'Tool execution failed');
      
      setSnackbar({ 
        open: true, 
        message: `Tool executed successfully: ${JSON.stringify(result.result).substring(0, 100)}...`, 
        severity: 'success' 
      });
      setOpenToolDialog(false);
    } catch (error) {
      setSnackbar({ open: true, message: `Tool execution failed: ${error}`, severity: 'error' });
    }
  };

  const toggleServerExpanded = (serverName: string) => {
    setExpandedServers(prev => ({
      ...prev,
      [serverName]: !prev[serverName]
    }));
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return <Typography>Loading MCP servers...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  const getAllTools = () => {
    const tools: MCPTool[] = [];
    servers.forEach(server => {
      if (server.tools) {
        server.tools.forEach(tool => {
          tools.push({
            ...tool,
            serverName: server.name
          });
        });
      }
    });
    return tools;
  };

  const renderServersTab = () => (
    <Box>
      {servers.length === 0 ? (
        <Typography>No MCP servers configured</Typography>
      ) : (
        <Grid container spacing={2}>
          {servers.map((server) => (
            <Grid item xs={12} md={6} key={server.name}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                    <Typography variant="h6">{server.name}</Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      {server.connected ? (
                        <Chip 
                          icon={<CheckCircleIcon />} 
                          label="Connected" 
                          color="success" 
                          size="small" 
                        />
                      ) : (
                        <Chip 
                          icon={<CancelIcon />} 
                          label="Disconnected" 
                          color="error" 
                          size="small" 
                        />
                      )}
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {server.url}
                  </Typography>

                  {server.error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {server.error}
                    </Alert>
                  )}

                  {server.tools && server.tools.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Tools Available: {server.tools.length}
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => toggleServerExpanded(server.name)}
                        endIcon={<ExpandMoreIcon />}
                      >
                        {expandedServers[server.name] ? 'Hide' : 'Show'} Tools
                      </Button>
                      
                      <Collapse in={expandedServers[server.name]}>
                        <Box sx={{ mt: 2 }}>
                          {server.tools.map((tool, index) => (
                            <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                              <CardContent sx={{ p: 2 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                  <Box>
                                    <Typography variant="subtitle2">{tool.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {tool.description}
                                    </Typography>
                                  </Box>
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setSelectedTool({ ...tool, serverName: server.name });
                                      setOpenToolDialog(true);
                                    }}
                                  >
                                    <PlayIcon />
                                  </IconButton>
                                </Box>
                              </CardContent>
                            </Card>
                          ))}
                        </Box>
                      </Collapse>
                    </Box>
                  )}

                  {server.lastConnected && (
                    <Typography variant="caption" color="text.secondary">
                      Last connected: {new Date(server.lastConnected).toLocaleString()}
                    </Typography>
                  )}

                  <Box display="flex" gap={1} sx={{ mt: 2 }}>
                    {server.connected ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleDisconnect(server.name)}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleConnect(server.name)}
                      >
                        Connect
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleDeleteServer(server.name)}
                    >
                      Delete
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  const renderToolsTab = () => {
    const allTools = getAllTools();
    
    return (
      <Box>
        {allTools.length === 0 ? (
          <Typography>No tools available from connected MCP servers</Typography>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tool Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Server</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allTools.map((tool, index) => (
                  <TableRow key={`${tool.serverName}-${tool.name}`}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <BuildIcon fontSize="small" />
                        <Typography variant="body2">{tool.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{tool.description}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={tool.serverName} 
                        size="small" 
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedTool(tool);
                          setOpenToolDialog(true);
                        }}
                      >
                        <PlayIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 2, mt: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">MCP Server Manager</Typography>
        <Box display="flex" gap={1}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchServers}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleOpenDialog}
          >
            Add Server
          </Button>
        </Box>
      </Box>

      <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)} sx={{ mb: 3 }}>
        <Tab icon={<SettingsIcon />} label={`Servers (${servers.length})`} />
        <Tab icon={<BuildIcon />} label={`Tools (${getAllTools().length})`} />
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" sx={{ py: 4 }}>
          <Typography>Loading MCP servers...</Typography>
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <>
          {currentTab === 0 && renderServersTab()}
          {currentTab === 1 && renderToolsTab()}
        </>
      )}
      
      {/* Add Server Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add MCP Server</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Server Name"
            fullWidth
            value={newServer.name}
            onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
            sx={{ mt: 1 }}
            helperText="Unique identifier for this MCP server"
          />
          <TextField
            margin="dense"
            label="Server URL"
            fullWidth
            value={newServer.url}
            onChange={(e) => setNewServer({ ...newServer, url: e.target.value })}
            sx={{ mt: 2 }}
            helperText="e.g., stdio://path/to/server or http://localhost:3000"
          />
          <TextField
            margin="dense"
            label="API Key (optional)"
            fullWidth
            value={newServer.apiKey}
            onChange={(e) => setNewServer({ ...newServer, apiKey: e.target.value })}
            sx={{ mt: 2 }}
            helperText="Authentication key if required by the server"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleConnectServer} 
            variant="contained"
            disabled={!newServer.name || !newServer.url}
          >
            Add Server
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tool Test Dialog */}
      <Dialog open={openToolDialog} onClose={() => setOpenToolDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Test Tool: {selectedTool?.name}
        </DialogTitle>
        <DialogContent>
          {selectedTool && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedTool.description}
              </Typography>
              
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Input Schema:
              </Typography>
              <Paper sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
                <pre style={{ margin: 0, fontSize: '0.75rem' }}>
                  {JSON.stringify(selectedTool.inputSchema, null, 2)}
                </pre>
              </Paper>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Tool Arguments (JSON)"
                value={toolTestArgs}
                onChange={(e) => setToolTestArgs(e.target.value)}
                helperText="Enter arguments as JSON object"
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenToolDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleTestTool} 
            variant="contained"
            startIcon={<PlayIcon />}
          >
            Execute Tool
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default MCPServerManager;