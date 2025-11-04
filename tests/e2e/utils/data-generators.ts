/**
 * Test data generators for creating realistic test data
 */

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'moderator';
  isActive: boolean;
  createdAt: string;
}

export interface Bot {
  id: string;
  name: string;
  description: string;
  token: string;
  platform: 'discord' | 'slack' | 'mattermost';
  isActive: boolean;
  createdAt: string;
  lastActivity: string;
}

export interface Message {
  id: string;
  content: string;
  userId: string;
  botId: string;
  platform: string;
  timestamp: string;
  isProcessed: boolean;
}

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  description: string;
  isActive: boolean;
  tools: string[];
  createdAt: string;
}

export interface Guard {
  id: string;
  name: string;
  type: 'owner' | 'user_list' | 'ip_list';
  config: Record<string, any>;
  isActive: boolean;
  createdAt: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  createdAt: string;
}

/**
 * Generate random user data
 */
export function generateUser(overrides: Partial<User> = {}): User {
  const id = generateId();
  const firstName = generateRandomFirstName();
  const lastName = generateRandomLastName();
  const username = generateRandomUsername(firstName, lastName);
  const email = generateRandomEmail(firstName, lastName);
  
  return {
    id,
    username,
    email,
    firstName,
    lastName,
    role: 'user',
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate admin user data
 */
export function generateAdminUser(overrides: Partial<User> = {}): User {
  return generateUser({
    role: 'admin',
    ...overrides,
  });
}

/**
 * Generate moderator user data
 */
export function generateModeratorUser(overrides: Partial<User> = {}): User {
  return generateUser({
    role: 'moderator',
    ...overrides,
  });
}

/**
 * Generate bot data
 */
export function generateBot(overrides: Partial<Bot> = {}): Bot {
  const platforms: Array<'discord' | 'slack' | 'mattermost'> = ['discord', 'slack', 'mattermost'];
  
  return {
    id: generateId(),
    name: generateRandomBotName(),
    description: generateRandomDescription(),
    token: generateRandomToken(),
    platform: platforms[Math.floor(Math.random() * platforms.length)],
    isActive: true,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate message data
 */
export function generateMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: generateId(),
    content: generateRandomMessageContent(),
    userId: generateId(),
    botId: generateId(),
    platform: 'discord',
    timestamp: new Date().toISOString(),
    isProcessed: false,
    ...overrides,
  };
}

/**
 * Generate MCP server data
 */
export function generateMCPServer(overrides: Partial<MCPServer> = {}): MCPServer {
  const toolNames = [
    'file-system', 'database', 'web-search', 'email', 'calendar',
    'weather', 'calculator', 'text-processor', 'image-generator', 'code-executor'
  ];
  
  const selectedTools = toolNames
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(Math.random() * 5) + 1);
  
  return {
    id: generateId(),
    name: generateRandomServerName(),
    url: generateRandomUrl(),
    description: generateRandomDescription(),
    isActive: true,
    tools: selectedTools,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate guard configuration data
 */
export function generateGuard(overrides: Partial<Guard> = {}): Guard {
  const guardTypes: Array<'owner' | 'user_list' | 'ip_list'> = ['owner', 'user_list', 'ip_list'];
  const type = guardTypes[Math.floor(Math.random() * guardTypes.length)];
  
  let config: Record<string, any> = {};
  
  switch (type) {
    case 'owner':
      config = { ownerId: generateId() };
      break;
    case 'user_list':
      config = { 
        allowedUsers: [generateId(), generateId(), generateId()],
        allowOwner: true
      };
      break;
    case 'ip_list':
      config = { 
        allowedIPs: [generateRandomIP(), generateRandomIP()],
        allowLocalhost: true
      };
      break;
  }
  
  return {
    id: generateId(),
    name: generateRandomGuardName(),
    type,
    config,
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate persona data
 */
export function generatePersona(overrides: Partial<Persona> = {}): Persona {
  const personas = [
    {
      name: 'Developer Assistant',
      description: 'Helps with coding tasks and technical questions',
      systemPrompt: 'You are a helpful developer assistant with expertise in multiple programming languages and frameworks.',
      temperature: 0.3,
      maxTokens: 2000,
    },
    {
      name: 'Support Agent',
      description: 'Provides customer support and answers questions',
      systemPrompt: 'You are a friendly and professional customer support agent dedicated to helping users resolve their issues.',
      temperature: 0.7,
      maxTokens: 1500,
    },
    {
      name: 'Teacher',
      description: 'Educational assistant for learning and explanations',
      systemPrompt: 'You are a patient and knowledgeable teacher who explains concepts clearly and provides helpful examples.',
      temperature: 0.5,
      maxTokens: 2500,
    },
  ];
  
  const basePersona = personas[Math.floor(Math.random() * personas.length)];
  
  return {
    id: generateId(),
    isActive: true,
    createdAt: new Date().toISOString(),
    ...basePersona,
    ...overrides,
  };
}

/**
 * Generate multiple users
 */
export function generateUsers(count: number, overrides: Partial<User> = {}): User[] {
  return Array.from({ length: count }, () => generateUser(overrides));
}

/**
 * Generate multiple bots
 */
export function generateBots(count: number, overrides: Partial<Bot> = {}): Bot[] {
  return Array.from({ length: count }, () => generateBot(overrides));
}

/**
 * Generate multiple messages
 */
export function generateMessages(count: number, overrides: Partial<Message> = {}): Message[] {
  return Array.from({ length: count }, () => generateMessage(overrides));
}

/**
 * Generate multiple MCP servers
 */
export function generateMCPServers(count: number, overrides: Partial<MCPServer> = {}): MCPServer[] {
  return Array.from({ length: count }, () => generateMCPServer(overrides));
}

/**
 * Generate multiple guards
 */
export function generateGuards(count: number, overrides: Partial<Guard> = {}): Guard[] {
  return Array.from({ length: count }, () => generateGuard(overrides));
}

/**
 * Generate multiple personas
 */
export function generatePersonas(count: number, overrides: Partial<Persona> = {}): Persona[] {
  return Array.from({ length: count }, () => generatePersona(overrides));
}

// Helper Functions

/**
 * Generate random ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Generate random string
 */
function generateRandomString(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate random first name
 */
function generateRandomFirstName(): string {
  const firstNames = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
    'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
    'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
    'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra', 'Donald', 'Ashley'
  ];
  return firstNames[Math.floor(Math.random() * firstNames.length)];
}

/**
 * Generate random last name
 */
function generateRandomLastName(): string {
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson',
    'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Green', 'Baker'
  ];
  return lastNames[Math.floor(Math.random() * lastNames.length)];
}

/**
 * Generate random username
 */
function generateRandomUsername(firstName: string, lastName: string): string {
  const separators = ['.', '_', '-', ''];
  const separator = separators[Math.floor(Math.random() * separators.length)];
  const number = Math.random() > 0.5 ? Math.floor(Math.random() * 999) : '';
  
  return `${firstName.toLowerCase()}${separator}${lastName.toLowerCase()}${number}`;
}

/**
 * Generate random email
 */
function generateRandomEmail(firstName: string, lastName: string): string {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'example.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const separators = ['.', '_', '-'];
  const separator = separators[Math.floor(Math.random() * separators.length)];
  
  return `${firstName.toLowerCase()}${separator}${lastName.toLowerCase()}@${domain}`;
}

/**
 * Generate random bot name
 */
function generateRandomBotName(): string {
  const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega', 'Sigma', 'Theta', 'Lambda'];
  const suffixes = ['Bot', 'Assistant', 'Helper', 'Agent', 'Worker', 'Runner', 'Parser', 'Monitor'];
  const numbers = Math.random() > 0.5 ? Math.floor(Math.random() * 999) : '';
  
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${suffixes[Math.floor(Math.random() * suffixes.length)]}${numbers}`;
}

/**
 * Generate random description
 */
function generateRandomDescription(): string {
  const descriptions = [
    'Automated assistant for handling routine tasks',
    'AI-powered chatbot for customer support',
    'Integration bot for external services',
    'Monitoring and alerting system',
    'Data processing and analysis tool',
    'Content moderation and management',
    'API integration and synchronization',
    'Workflow automation assistant'
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

/**
 * Generate random token
 */
function generateRandomToken(): string {
  return generateRandomString(32);
}

/**
 * Generate random message content
 */
function generateRandomMessageContent(): string {
  const messages = [
    'Hello, how can I help you today?',
    'Can you assist me with this task?',
    'I need some information about the system.',
    'Thank you for your help!',
    'Could you please guide me through this process?',
    'I have a question about the configuration.',
    'Everything is working as expected.',
    'I found an issue that needs attention.',
    'The system is running smoothly.',
    'Can you check the status for me?'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Generate random server name
 */
function generateRandomServerName(): string {
  const names = [
    'Production Server', 'Development Server', 'Test Server', 'Staging Server',
    'API Server', 'Database Server', 'Cache Server', 'File Server',
    'Email Server', 'Notification Server', 'Authentication Server', 'Monitoring Server'
  ];
  return names[Math.floor(Math.random() * names.length)];
}

/**
 * Generate random URL
 */
function generateRandomUrl(): string {
  const protocols = ['http', 'https'];
  const domains = ['localhost', 'example.com', 'test.local', 'api.example.org'];
  const ports = ['', ':3000', ':8080', ':9000', ':5000'];
  const paths = ['', '/api', '/v1', '/webhook', '/endpoint'];
  
  const protocol = protocols[Math.floor(Math.random() * protocols.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const port = ports[Math.floor(Math.random() * ports.length)];
  const path = paths[Math.floor(Math.random() * paths.length)];
  
  return `${protocol}://${domain}${port}${path}`;
}

/**
 * Generate random guard name
 */
function generateRandomGuardName(): string {
  const names = [
    'Admin Access Guard', 'User Permission Guard', 'IP Restriction Guard',
    'Tool Access Guard', 'API Access Guard', 'Resource Guard',
    'Security Guard', 'Permission Guard', 'Access Control Guard'
  ];
  return names[Math.floor(Math.random() * names.length)];
}

/**
 * Generate random IP address
 */
function generateRandomIP(): string {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

/**
 * Generate test data set for common scenarios
 */
export const TEST_DATA_SETS = {
  users: {
    admin: generateAdminUser({ username: 'testadmin', email: 'admin@test.com' }),
    moderator: generateModeratorUser({ username: 'testmoderator', email: 'moderator@test.com' }),
    regular: generateUser({ username: 'testuser', email: 'user@test.com' }),
    inactive: generateUser({ username: 'inactive', email: 'inactive@test.com', isActive: false }),
  },
  bots: {
    active: generateBot({ name: 'Active Test Bot', isActive: true }),
    inactive: generateBot({ name: 'Inactive Test Bot', isActive: false }),
    discord: generateBot({ name: 'Discord Bot', platform: 'discord' }),
    slack: generateBot({ name: 'Slack Bot', platform: 'slack' }),
  },
  servers: {
    active: generateMCPServer({ name: 'Active MCP Server', isActive: true }),
    inactive: generateMCPServer({ name: 'Inactive MCP Server', isActive: false }),
    minimal: generateMCPServer({ 
      name: 'Minimal Server', 
      tools: ['file-system'],
      description: 'Basic server with minimal tools'
    }),
  },
  guards: {
    owner: generateGuard({ type: 'owner', name: 'Owner Guard' }),
    userlist: generateGuard({ type: 'user_list', name: 'User List Guard' }),
    iplist: generateGuard({ type: 'ip_list', name: 'IP List Guard' }),
  },
  personas: {
    developer: generatePersona({ name: 'Developer Assistant' }),
    support: generatePersona({ name: 'Support Agent' }),
    teacher: generatePersona({ name: 'Teacher' }),
  },
} as const;