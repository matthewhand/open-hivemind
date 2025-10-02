import { Router } from 'express';
import Debug from 'debug';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const debug = Debug('app:webui:mcp');
const router = Router();

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

interface MCPClient {
  client: Client;
  transport: StdioClientTransport;
  server: MCPServer;
}

const MCP_SERVERS_CONFIG_FILE = join(process.cwd(), 'data', 'mcp-servers.json');

// In-memory store for connected MCP clients
const connectedClients = new Map<string, MCPClient>();

// Ensure data directory exists
const ensureDataDir = async () => {
  const dataDir = join(process.cwd(), 'data');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (_error) {
    debug('Error creating data directory:', _error);
  }
};

// Load/Save MCP server configurations
const loadMCPServers = async (): Promise<MCPServer[]> => {
  try {
    const data = await fs.readFile(MCP_SERVERS_CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    debug('MCP servers config file not found, using defaults');
    return [];
  }
};

const saveMCPServers = async (servers: MCPServer[]): Promise<void> => {
  await ensureDataDir();
  await fs.writeFile(MCP_SERVERS_CONFIG_FILE, JSON.stringify(servers, null, 2));
};

// Connect to MCP server
const connectToMCPServer = async (server: MCPServer): Promise<MCPClient> => {
  try {
    debug(`Connecting to MCP server: ${server.name} at ${server.url}`);
    
    // For stdio transport (local MCP servers)
    if (server.url.startsWith('stdio://')) {
      const command = server.url.replace('stdio://', '');
      const transport = new StdioClientTransport({
        command: command,
        args: []
      });
      
      const client = new Client({
        name: `hivemind-${server.name}`,
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {}
        }
      });
      
      await client.connect(transport);
      
      // Get available tools
      const toolsResponse = await client.listTools();
      const tools = toolsResponse.tools.map(tool => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema
      }));
      
      const mcpClient: MCPClient = {
        client,
        transport,
        server: {
          ...server,
          connected: true,
          tools,
          lastConnected: new Date().toISOString(),
          error: undefined
        }
      };
      
      connectedClients.set(server.name, mcpClient);
      debug(`Successfully connected to MCP server: ${server.name}`);
      
      return mcpClient;
    } else {
      throw new Error(`Unsupported MCP server URL scheme: ${server.url}`);
    }
  } catch (error) {
    debug(`Failed to connect to MCP server ${server.name}:`, error);
    throw error;
  }
};

// Disconnect from MCP server
const disconnectFromMCPServer = async (serverName: string): Promise<void> => {
  try {
    const mcpClient = connectedClients.get(serverName);
    if (mcpClient) {
      await mcpClient.client.close();
      connectedClients.delete(serverName);
      debug(`Disconnected from MCP server: ${serverName}`);
    }
  } catch (_error) {
    debug(`Error disconnecting from MCP server ${serverName}:`, _error);
    throw _error;
  }
};

// Routes

// GET /api/mcp/servers - Get all MCP servers
router.get('/servers', async (req, res) => {
  try {
    const servers = await loadMCPServers();
    
    // Update connection status based on active clients
    const updatedServers = servers.map(server => ({
      ...server,
      connected: connectedClients.has(server.name),
      tools: connectedClients.get(server.name)?.server.tools || server.tools
    }));
    
    res.json({ servers: updatedServers });
  } catch (error) {
    debug('Error fetching MCP servers:', error);
    res.status(500).json({ error: 'Failed to fetch MCP servers' });
  }
});

// POST /api/mcp/servers - Add new MCP server
router.post('/servers', async (req, res) => {
  try {
    const { name, url, apiKey } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }
    
    const servers = await loadMCPServers();
    
    // Check if server already exists
    if (servers.find(s => s.name === name)) {
      return res.status(400).json({ error: 'MCP server with this name already exists' });
    }
    
    const newServer: MCPServer = {
      name,
      url,
      apiKey,
      connected: false
    };
    
    servers.push(newServer);
    await saveMCPServers(servers);
    
    debug(`Added new MCP server: ${name}`);
    res.json({ server: newServer });
  } catch (error) {
    debug('Error adding MCP server:', error);
    res.status(500).json({ error: 'Failed to add MCP server' });
  }
});

// POST /api/mcp/servers/:name/connect - Connect to MCP server
router.post('/servers/:name/connect', async (req, res) => {
  try {
    const { name } = req.params;
    
    const servers = await loadMCPServers();
    const server = servers.find(s => s.name === name);
    
    if (!server) {
      return res.status(404).json({ error: 'MCP server not found' });
    }
    
    if (connectedClients.has(name)) {
      return res.status(400).json({ error: 'MCP server already connected' });
    }
    
    try {
      const mcpClient = await connectToMCPServer(server);
      
      // Update server config with connection info
      const serverIndex = servers.findIndex(s => s.name === name);
      servers[serverIndex] = mcpClient.server;
      await saveMCPServers(servers);
      
      res.json({ 
        server: mcpClient.server,
        message: 'Successfully connected to MCP server'
      });
    } catch (error) {
      // Update server config with error
      const serverIndex = servers.findIndex(s => s.name === name);
      servers[serverIndex] = {
        ...server,
        connected: false,
        error: String(error)
      };
      await saveMCPServers(servers);
      
      res.status(500).json({ error: `Failed to connect to MCP server: ${error}` });
    }
  } catch (error) {
    debug('Error connecting to MCP server:', error);
    res.status(500).json({ error: 'Failed to connect to MCP server' });
  }
});

// POST /api/mcp/servers/:name/disconnect - Disconnect from MCP server
router.post('/servers/:name/disconnect', async (req, res) => {
  try {
    const { name } = req.params;
    
    await disconnectFromMCPServer(name);
    
    // Update server config
    const servers = await loadMCPServers();
    const serverIndex = servers.findIndex(s => s.name === name);
    
    if (serverIndex !== -1) {
      servers[serverIndex] = {
        ...servers[serverIndex],
        connected: false,
        error: undefined
      };
      await saveMCPServers(servers);
    }
    
    res.json({ message: 'Successfully disconnected from MCP server' });
  } catch (error) {
    debug('Error disconnecting from MCP server:', error);
    res.status(500).json({ error: 'Failed to disconnect from MCP server' });
  }
});

// DELETE /api/mcp/servers/:name - Remove MCP server
router.delete('/servers/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    // Disconnect if connected
    if (connectedClients.has(name)) {
      await disconnectFromMCPServer(name);
    }
    
    const servers = await loadMCPServers();
    const filteredServers = servers.filter(s => s.name !== name);
    
    if (filteredServers.length === servers.length) {
      return res.status(404).json({ error: 'MCP server not found' });
    }
    
    await saveMCPServers(filteredServers);
    
    debug(`Removed MCP server: ${name}`);
    res.json({ success: true });
  } catch (error) {
    debug('Error removing MCP server:', error);
    res.status(500).json({ error: 'Failed to remove MCP server' });
  }
});

// GET /api/mcp/servers/:name/tools - Get tools from MCP server
router.get('/servers/:name/tools', async (req, res) => {
  try {
    const { name } = req.params;
    
    const mcpClient = connectedClients.get(name);
    if (!mcpClient) {
      return res.status(404).json({ error: 'MCP server not connected' });
    }
    
    const toolsResponse = await mcpClient.client.listTools();
    const tools = toolsResponse.tools.map(tool => ({
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema
    }));
    
    res.json({ tools });
  } catch (error) {
    debug('Error fetching MCP server tools:', error);
    res.status(500).json({ error: 'Failed to fetch MCP server tools' });
  }
});

// POST /api/mcp/servers/:name/call-tool - Call a tool on MCP server
router.post('/servers/:name/call-tool', async (req, res) => {
  try {
    const { name } = req.params;
    const { toolName, arguments: toolArgs } = req.body;
    
    if (!toolName) {
      return res.status(400).json({ error: 'Tool name is required' });
    }
    
    const mcpClient = connectedClients.get(name);
    if (!mcpClient) {
      return res.status(404).json({ error: 'MCP server not connected' });
    }
    
    const result = await mcpClient.client.callTool({
      name: toolName,
      arguments: toolArgs || {}
    });
    
    res.json({ result });
  } catch (error) {
    debug('Error calling MCP tool:', error);
    res.status(500).json({ error: `Failed to call MCP tool: ${error}` });
  }
});

// GET /api/mcp/connected - Get all connected MCP servers
router.get('/connected', async (req, res) => {
  try {
    const connected = Array.from(connectedClients.values()).map(client => ({
      name: client.server.name,
      url: client.server.url,
      toolCount: client.server.tools?.length || 0,
      lastConnected: client.server.lastConnected
    }));
    
    res.json({ connected });
  } catch (error) {
    debug('Error fetching connected MCP servers:', error);
    res.status(500).json({ error: 'Failed to fetch connected MCP servers' });
  }
});

export default router;