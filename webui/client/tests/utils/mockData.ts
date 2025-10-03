// Mock data for testing

// Mock user data
export const mockUsers = [
  {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    permissions: ['read'],
  },
  {
    id: '2',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    permissions: ['read', 'write', 'delete'],
  },
];

// Mock agent data
export const mockAgents = [
  {
    id: '1',
    name: 'Test Agent 1',
    description: 'A test agent',
    status: 'active',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    createdAt: '2023-10-26T10:00:00Z',
    updatedAt: '2023-10-26T10:00:00Z',
  },
  {
    id: '2',
    name: 'Test Agent 2',
    description: 'Another test agent',
    status: 'inactive',
    provider: 'anthropic',
    model: 'claude-2',
    createdAt: '2023-10-25T10:00:00Z',
    updatedAt: '2023-10-25T10:00:00Z',
  },
];

// Mock persona data
export const mockPersonas = [
  {
    id: '1',
    name: 'Assistant',
    description: 'General assistant persona',
    systemPrompt: 'You are a helpful assistant.',
    temperature: 0.7,
    maxTokens: 1000,
    createdAt: '2023-10-26T10:00:00Z',
    updatedAt: '2023-10-26T10:00:00Z',
  },
  {
    id: '2',
    name: 'Teacher',
    description: 'Educational persona',
    systemPrompt: 'You are a patient teacher.',
    temperature: 0.5,
    maxTokens: 1500,
    createdAt: '2023-10-25T10:00:00Z',
    updatedAt: '2023-10-25T10:00:00Z',
  },
];

// Mock provider data
export const mockProviders = {
  llm: [
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'OpenAI API provider',
      enabled: true,
      config: {
        apiKey: 'sk-test-key',
        organization: 'org-test',
      },
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      description: 'Anthropic API provider',
      enabled: false,
      config: {
        apiKey: 'sk-ant-test-key',
      },
    },
  ],
  messenger: [
    {
      id: 'discord',
      name: 'Discord',
      description: 'Discord bot integration',
      enabled: true,
      config: {
        botToken: 'discord-test-token',
        clientId: 'discord-test-client-id',
      },
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Slack bot integration',
      enabled: true,
      config: {
        botToken: 'slack-test-token',
        signingSecret: 'slack-test-secret',
      },
    },
  ],
};

// Mock metrics data
export const mockMetrics = {
  totalRequests: 1000,
  averageResponseTime: 150,
  errorRate: 0.02,
  activeConnections: 50,
  uptime: 0.999,
  memoryUsage: 512,
  cpuUsage: 25,
  timestamp: '2023-10-26T10:00:00Z',
};

// Mock message flow events
export const mockMessageFlowEvents = [
  {
    id: '1',
    timestamp: '2023-10-26T10:00:00Z',
    botName: 'Test Bot',
    provider: 'discord',
    channelId: '123',
    userId: '456',
    messageType: 'incoming' as const,
    contentLength: 100,
    processingTime: 150,
    status: 'success' as const,
  },
  {
    id: '2',
    timestamp: '2023-10-26T10:01:00Z',
    botName: 'Test Bot',
    provider: 'discord',
    channelId: '123',
    userId: '456',
    messageType: 'outgoing' as const,
    contentLength: 200,
    processingTime: 200,
    status: 'success' as const,
  },
  {
    id: '3',
    timestamp: '2023-10-26T10:02:00Z',
    botName: 'Test Bot',
    provider: 'discord',
    channelId: '123',
    userId: '456',
    messageType: 'incoming' as const,
    contentLength: 150,
    processingTime: 0,
    status: 'error' as const,
    errorMessage: 'API rate limit exceeded',
  },
];

// Mock alert events
export const mockAlertEvents = [
  {
    id: '1',
    timestamp: '2023-10-26T10:00:00Z',
    level: 'warning' as const,
    message: 'API rate limit approaching',
    botName: 'Test Bot',
    provider: 'discord',
  },
  {
    id: '2',
    timestamp: '2023-10-26T10:01:00Z',
    level: 'error' as const,
    message: 'API authentication failed',
    botName: 'Test Bot',
    provider: 'openai',
  },
  {
    id: '3',
    timestamp: '2023-10-26T10:02:00Z',
    level: 'info' as const,
    message: 'Bot started successfully',
    botName: 'Test Bot',
    provider: 'discord',
  },
];

// Mock performance metrics
export const mockPerformanceMetrics = [
  {
    timestamp: '2023-10-26T10:00:00Z',
    responseTime: 150,
    memoryUsage: 512,
    cpuUsage: 25,
    activeConnections: 10,
    messageRate: 5,
    errorRate: 0.01,
  },
  {
    timestamp: '2023-10-26T10:01:00Z',
    responseTime: 200,
    memoryUsage: 600,
    cpuUsage: 30,
    activeConnections: 15,
    messageRate: 8,
    errorRate: 0.02,
  },
  {
    timestamp: '2023-10-26T10:02:00Z',
    responseTime: 120,
    memoryUsage: 480,
    cpuUsage: 20,
    activeConnections: 8,
    messageRate: 3,
    errorRate: 0.00,
  },
];

// Mock bot stats
export const mockBotStats = [
  {
    name: 'Test Bot 1',
    messageCount: 100,
    errorCount: 5,
    averageResponseTime: 150,
    lastActive: '2023-10-26T10:00:00Z',
  },
  {
    name: 'Test Bot 2',
    messageCount: 200,
    errorCount: 10,
    averageResponseTime: 200,
    lastActive: '2023-10-26T10:01:00Z',
  },
];

// Mock sitemap data
export const mockSitemapData = {
  generated: '2023-10-26T10:00:00Z',
  baseUrl: 'https://example.com',
  totalUrls: 3,
  urls: [
    {
      url: '/',
      fullUrl: 'https://example.com/',
      changefreq: 'daily',
      priority: 1.0,
      lastmod: '2023-10-26T10:00:00Z',
      description: 'Home page',
      access: 'public' as const,
    },
    {
      url: '/dashboard',
      fullUrl: 'https://example.com/dashboard',
      changefreq: 'weekly',
      priority: 0.8,
      lastmod: '2023-10-25T10:00:00Z',
      description: 'Dashboard page',
      access: 'authenticated' as const,
    },
    {
      url: '/admin',
      fullUrl: 'https://example.com/admin',
      changefreq: 'monthly',
      priority: 0.5,
      lastmod: '2023-10-24T10:00:00Z',
      description: 'Admin page',
      access: 'owner' as const,
    },
  ],
};

// Mock auth tokens
export const mockAuthTokens = {
  accessToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test',
  refreshToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.refresh',
  expiresIn: 3600,
};

// Mock file data
export const mockFiles = [
  {
    name: 'test.txt',
    content: 'This is a test file',
    type: 'text/plain',
    size: 21,
  },
  {
    name: 'test.json',
    content: '{"key": "value"}',
    type: 'application/json',
    size: 17,
  },
  {
    name: 'test.csv',
    content: 'name,age\nJohn,30\nJane,25',
    type: 'text/csv',
    size: 25,
  },
];

// Mock form data
export const mockFormData = {
  user: {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    confirmPassword: 'password123',
  },
  agent: {
    name: 'Test Agent',
    description: 'A test agent',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
  },
  persona: {
    name: 'Test Persona',
    description: 'A test persona',
    systemPrompt: 'You are a helpful assistant.',
    temperature: 0.7,
    maxTokens: 1000,
  },
};

// Mock API responses
export const mockApiResponses = {
  login: {
    success: true,
    accessToken: mockAuthTokens.accessToken,
    refreshToken: mockAuthTokens.refreshToken,
    expiresIn: mockAuthTokens.expiresIn,
  },
  logout: {
    success: true,
    message: 'Logged out successfully',
  },
  refreshToken: {
    success: true,
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    expiresIn: 3600,
  },
  verifyToken: {
    success: true,
    user: mockUsers[0],
  },
  getAgents: {
    success: true,
    data: mockAgents,
  },
  getPersonas: {
    success: true,
    data: mockPersonas,
  },
  getProviders: {
    success: true,
    data: mockProviders,
  },
  getMetrics: {
    success: true,
    data: mockMetrics,
  },
  createAgent: {
    success: true,
    data: mockAgents[0],
  },
  updateAgent: {
    success: true,
    data: mockAgents[0],
  },
  deleteAgent: {
    success: true,
    message: 'Agent deleted successfully',
  },
  createPersona: {
    success: true,
    data: mockPersonas[0],
  },
  updatePersona: {
    success: true,
    data: mockPersonas[0],
  },
  deletePersona: {
    success: true,
    message: 'Persona deleted successfully',
  },
};