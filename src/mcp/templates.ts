/**
 * Registry of common MCP server templates for quick installation.
 */

export interface MCPTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultUrl: string;
  requiredConfigFields: Array<{
    key: string;
    label: string;
    type: 'string' | 'password' | 'number';
    placeholder?: string;
    description?: string;
  }>;
  docsUrl?: string;
}

export const MCP_TEMPLATES: MCPTemplate[] = [
  {
    id: 'google-search',
    name: 'Google Search',
    description: 'Allow bots to search the web using Google Search API',
    icon: '🔍',
    defaultUrl: 'http://localhost:8001',
    requiredConfigFields: [
      { key: 'API_KEY', label: 'Google API Key', type: 'password', placeholder: 'AIza...' },
      { key: 'CX', label: 'Search Engine ID', type: 'string', placeholder: '0123...' },
    ],
    docsUrl: 'https://developers.google.com/custom-search/v1/overview',
  },
  {
    id: 'sqlite',
    name: 'SQLite Database',
    description: 'Interact with local SQLite databases using natural language',
    icon: '💾',
    defaultUrl: 'http://localhost:8002',
    requiredConfigFields: [
      { key: 'DB_PATH', label: 'Database Path', type: 'string', placeholder: './data/mcp.db' },
    ],
  },
  {
    id: 'filesystem',
    name: 'Local Filesystem',
    description: 'Read and write local files in specific directories',
    icon: '📁',
    defaultUrl: 'http://localhost:8003',
    requiredConfigFields: [
      {
        key: 'ALLOWED_DIRECTORIES',
        label: 'Allowed Paths',
        type: 'string',
        placeholder: '/tmp,/mnt/data',
      },
    ],
  },
  {
    id: 'fetch',
    name: 'Web Fetch',
    description: 'Generic tool to fetch content from any URL',
    icon: '🌐',
    defaultUrl: 'http://localhost:8004',
    requiredConfigFields: [],
  },
  {
    id: 'memory-mem0',
    name: 'Mem0 Memory',
    description: 'Personalized long-term memory for AI agents',
    icon: '🧠',
    defaultUrl: 'http://localhost:8005',
    requiredConfigFields: [{ key: 'MEM0_API_KEY', label: 'Mem0 API Key', type: 'password' }],
    docsUrl: 'https://docs.mem0.ai',
  },
];
