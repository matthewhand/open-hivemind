import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, CardActions, Button, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, PlayArrow as StartIcon, Stop as StopIcon } from '@mui/icons-material';
import { Breadcrumbs, Alert } from '../components/DaisyUI';

interface MCPServer {
  id: string;
  name: string;
  url: string;
  status: 'running' | 'stopped' | 'error';
  description: string;
  toolCount: number;
  lastConnected?: string;
}

const MCPServersPage: React.FC = () => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const breadcrumbItems = [
    { label: 'MCP', href: '/uber/mcp' },
    { label: 'Servers', href: '/uber/mcp/servers', isActive: true }
  ];

  // Mock servers - in real app this would come from API
  const mockServers: MCPServer[] = [
    {
      id: '1',
      name: 'GitHub Integration',
      url: 'mcp://github-server:8080',
      status: 'running',
      description: 'GitHub repository management and issue tracking',
      toolCount: 12,
      lastConnected: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      name: 'Database Tools',
      url: 'mcp://db-server:3306',
      status: 'running',
      description: 'Database query and management tools',
      toolCount: 8,
      lastConnected: '2024-01-15T09:15:00Z'
    },
    {
      id: '3',
      name: 'File System',
      url: 'mcp://fs-server:9000',
      status: 'stopped',
      description: 'File system operations and management',
      toolCount: 15,
      lastConnected: '2024-01-14T16:45:00Z'
    },
    {
      id: '4',
      name: 'API Gateway',
      url: 'mcp://api-gateway:8443',
      status: 'error',
      description: 'External API integrations and webhooks',
      toolCount: 6,
      lastConnected: '2024-01-13T14:20:00Z'
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setServers(mockServers);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'stopped': return 'default';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const handleServerAction = async (serverId: string, action: 'start' | 'stop' | 'restart') => {
    try {
      // Simulate API call
      setAlert({ type: 'success', message: `Server ${action} action completed` });
      
      // Update server status
      setServers(prev => prev.map(server => 
        server.id === serverId 
          ? { ...server, status: action === 'start' ? 'running' : 'stopped' }
          : server
      ));
    } catch (error) {
      setAlert({ type: 'error', message: `Failed to ${action} server` });
    }
  };

  const handleAddServer = () => {
    setSelectedServer({
      id: '',
      name: '',
      url: '',
      status: 'stopped',
      description: '',
      toolCount: 0
    });
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEditServer = (server: MCPServer) => {
    setSelectedServer(server);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleSaveServer = async () => {
    if (!selectedServer) return;

    try {
      if (isEditing) {
        // Update existing server
        setServers(prev => prev.map(server => 
          server.id === selectedServer.id ? selectedServer : server
        ));
        setAlert({ type: 'success', message: 'Server updated successfully' });
      } else {
        // Add new server
        const newServer = { ...selectedServer, id: Date.now().toString() };
        setServers(prev => [...prev, newServer]);
        setAlert({ type: 'success', message: 'Server added successfully' });
      }
      setDialogOpen(false);
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to save server' });
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    if (window.confirm('Are you sure you want to delete this server?')) {
      try {
        setServers(prev => prev.filter(server => server.id !== serverId));
        setAlert({ type: 'success', message: 'Server deleted successfully' });
      } catch (error) {
        setAlert({ type: 'error', message: 'Failed to delete server' });
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading MCP servers...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs items={breadcrumbItems} />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            MCP Servers
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage Model Context Protocol servers and their tools
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddServer}
        >
          Add Server
        </Button>
      </Box>

      {alert && (
        <Alert 
          status={alert.type === 'success' ? 'success' : 'error'} 
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <Grid container spacing={3}>
        {servers.map((server) => (
          <Grid item xs={12} md={6} lg={4} key={server.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="h2">
                    {server.name}
                  </Typography>
                  <Chip 
                    label={server.status}
                    color={getStatusColor(server.status) as any}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {server.description}
                </Typography>

                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>URL:</strong> {server.url}
                </Typography>

                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Tools:</strong> {server.toolCount}
                </Typography>

                {server.lastConnected && (
                  <Typography variant="body2" color="text.secondary">
                    Last connected: {new Date(server.lastConnected).toLocaleString()}
                  </Typography>
                )}
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'space-between' }}>
                <Box>
                  {server.status === 'running' ? (
                    <IconButton 
                      onClick={() => handleServerAction(server.id, 'stop')}
                      color="error"
                      title="Stop Server"
                    >
                      <StopIcon />
                    </IconButton>
                  ) : (
                    <IconButton 
                      onClick={() => handleServerAction(server.id, 'start')}
                      color="success"
                      title="Start Server"
                    >
                      <StartIcon />
                    </IconButton>
                  )}
                </Box>
                <Box>
                  <IconButton 
                    onClick={() => handleEditServer(server)}
                    title="Edit Server"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    onClick={() => handleDeleteServer(server.id)}
                    color="error"
                    title="Delete Server"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add/Edit Server Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit MCP Server' : 'Add MCP Server'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Server Name"
              value={selectedServer?.name || ''}
              onChange={(e) => setSelectedServer(prev => prev ? { ...prev, name: e.target.value } : null)}
              fullWidth
              required
            />
            <TextField
              label="Server URL"
              value={selectedServer?.url || ''}
              onChange={(e) => setSelectedServer(prev => prev ? { ...prev, url: e.target.value } : null)}
              fullWidth
              required
              placeholder="mcp://server-host:port"
            />
            <TextField
              label="Description"
              value={selectedServer?.description || ''}
              onChange={(e) => setSelectedServer(prev => prev ? { ...prev, description: e.target.value } : null)}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveServer} variant="contained">
            {isEditing ? 'Update' : 'Add'} Server
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MCPServersPage;