import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, CardActions, Button, Chip, FormControl, InputLabel, Select, MenuItem, TextField, InputAdornment } from '@mui/material';
import { Search as SearchIcon, Build as ToolIcon, PlayArrow as RunIcon } from '@mui/icons-material';
import { Breadcrumbs, Alert } from '../components/DaisyUI';

interface MCPTool {
  id: string;
  name: string;
  serverId: string;
  serverName: string;
  description: string;
  category: string;
  inputSchema: any;
  outputSchema: any;
  usageCount: number;
  lastUsed?: string;
  enabled: boolean;
}

const MCPToolsPage: React.FC = () => {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [filteredTools, setFilteredTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [serverFilter, setServerFilter] = useState('all');
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const breadcrumbItems = [
    { label: 'MCP', href: '/uber/mcp' },
    { label: 'Tools', href: '/uber/mcp/tools', isActive: true }
  ];

  // Mock tools - in real app this would come from API
  const mockTools: MCPTool[] = [
    {
      id: '1',
      name: 'github_create_issue',
      serverId: '1',
      serverName: 'GitHub Integration',
      description: 'Create a new issue in a GitHub repository',
      category: 'git',
      inputSchema: { repository: 'string', title: 'string', body: 'string' },
      outputSchema: { issueNumber: 'number', url: 'string' },
      usageCount: 45,
      lastUsed: '2024-01-15T10:30:00Z',
      enabled: true
    },
    {
      id: '2',
      name: 'github_list_repos',
      serverId: '1',
      serverName: 'GitHub Integration',
      description: 'List all repositories for a user or organization',
      category: 'git',
      inputSchema: { owner: 'string', type: 'string' },
      outputSchema: { repositories: 'array' },
      usageCount: 23,
      lastUsed: '2024-01-14T16:45:00Z',
      enabled: true
    },
    {
      id: '3',
      name: 'db_query',
      serverId: '2',
      serverName: 'Database Tools',
      description: 'Execute a SQL query against the database',
      category: 'database',
      inputSchema: { query: 'string', parameters: 'array' },
      outputSchema: { rows: 'array', count: 'number' },
      usageCount: 78,
      lastUsed: '2024-01-15T09:15:00Z',
      enabled: true
    },
    {
      id: '4',
      name: 'db_backup',
      serverId: '2',
      serverName: 'Database Tools',
      description: 'Create a backup of the database',
      category: 'database',
      inputSchema: { tables: 'array', compression: 'boolean' },
      outputSchema: { backupPath: 'string', size: 'number' },
      usageCount: 12,
      lastUsed: '2024-01-13T14:20:00Z',
      enabled: false
    },
    {
      id: '5',
      name: 'fs_read_file',
      serverId: '3',
      serverName: 'File System',
      description: 'Read contents of a file',
      category: 'filesystem',
      inputSchema: { path: 'string', encoding: 'string' },
      outputSchema: { content: 'string', size: 'number' },
      usageCount: 156,
      lastUsed: '2024-01-12T11:30:00Z',
      enabled: true
    },
    {
      id: '6',
      name: 'api_call',
      serverId: '4',
      serverName: 'API Gateway',
      description: 'Make HTTP requests to external APIs',
      category: 'network',
      inputSchema: { url: 'string', method: 'string', headers: 'object' },
      outputSchema: { response: 'object', status: 'number' },
      usageCount: 34,
      lastUsed: '2024-01-10T08:15:00Z',
      enabled: true
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTools(mockTools);
      setFilteredTools(mockTools);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    let filtered = tools;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(tool => 
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(tool => tool.category === categoryFilter);
    }

    // Apply server filter
    if (serverFilter !== 'all') {
      filtered = filtered.filter(tool => tool.serverId === serverFilter);
    }

    setFilteredTools(filtered);
  }, [tools, searchTerm, categoryFilter, serverFilter]);

  const categories = Array.from(new Set(tools.map(tool => tool.category)));
  const servers = Array.from(new Set(tools.map(tool => ({ id: tool.serverId, name: tool.serverName }))));

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      git: 'primary',
      database: 'secondary',
      filesystem: 'info',
      network: 'success',
      ai: 'warning'
    };
    return colors[category] || 'default';
  };

  const handleRunTool = async (tool: MCPTool) => {
    try {
      // Simulate tool execution
      setAlert({ type: 'success', message: `Tool "${tool.name}" executed successfully` });
      
      // Update usage count
      setTools(prev => prev.map(t => 
        t.id === tool.id 
          ? { ...t, usageCount: t.usageCount + 1, lastUsed: new Date().toISOString() }
          : t
      ));
    } catch (error) {
      setAlert({ type: 'error', message: `Failed to execute tool "${tool.name}"` });
    }
  };

  const handleToggleTool = async (toolId: string) => {
    try {
      setTools(prev => prev.map(tool => 
        tool.id === toolId 
          ? { ...tool, enabled: !tool.enabled }
          : tool
      ));
      setAlert({ type: 'success', message: 'Tool status updated' });
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to update tool status' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading MCP tools...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs items={breadcrumbItems} />
      
      <Box sx={{ mt: 2, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          MCP Tools
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse and manage tools available from your MCP servers
        </Typography>
      </Box>

      {alert && (
        <Alert 
          status={alert.type === 'success' ? 'success' : 'error'} 
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search tools..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
        
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={categoryFilter}
            label="Category"
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <MenuItem value="all">All Categories</MenuItem>
            {categories.map(category => (
              <MenuItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Server</InputLabel>
          <Select
            value={serverFilter}
            label="Server"
            onChange={(e) => setServerFilter(e.target.value)}
          >
            <MenuItem value="all">All Servers</MenuItem>
            {servers.map(server => (
              <MenuItem key={server.id} value={server.id}>
                {server.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredTools.length} of {tools.length} tools
      </Typography>

      <Grid container spacing={3}>
        {filteredTools.map((tool) => (
          <Grid item xs={12} md={6} lg={4} key={tool.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ToolIcon color="action" />
                    <Typography variant="h6" component="h2">
                      {tool.name}
                    </Typography>
                  </Box>
                  <Chip 
                    label={tool.enabled ? 'Enabled' : 'Disabled'}
                    color={tool.enabled ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {tool.description}
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Chip 
                    label={tool.category}
                    color={getCategoryColor(tool.category) as any}
                    size="small"
                  />
                  <Chip label={tool.serverName} variant="outlined" size="small" />
                </Box>

                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Usage:</strong> {tool.usageCount} times
                </Typography>

                {tool.lastUsed && (
                  <Typography variant="body2" color="text.secondary">
                    Last used: {new Date(tool.lastUsed).toLocaleString()}
                  </Typography>
                )}
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'space-between' }}>
                <Button
                  size="small"
                  onClick={() => handleToggleTool(tool.id)}
                  color={tool.enabled ? 'error' : 'success'}
                >
                  {tool.enabled ? 'Disable' : 'Enable'}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<RunIcon />}
                  onClick={() => handleRunTool(tool)}
                  disabled={!tool.enabled}
                >
                  Run Tool
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredTools.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No tools found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search criteria or add more MCP servers
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MCPToolsPage;