import * as fs from 'fs';
import * as path from 'path';
import Debug from 'debug';

const debug = Debug('app:mcpServerProfiles');

/**
 * MCP Server Configuration within a profile
 */
export interface MCPServerConfig {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    timeout?: number;
    enabled?: boolean;
}

/**
 * MCP Server Profile - a reusable collection of MCP servers
 * that can be assigned to multiple bots
 */
export interface MCPServerProfile {
    key: string;           // Unique identifier (e.g., 'dev-tools', 'research-agent')
    name: string;          // Display name
    description?: string;
    servers: MCPServerConfig[];
    category?: string;     // 'development', 'research', 'productivity', etc.
    enabled: boolean;
}

const DEFAULT_MCP_SERVER_PROFILES: MCPServerProfile[] = [
    {
        key: 'none',
        name: 'No Tools',
        description: 'Bot has no MCP tool access',
        servers: [],
        category: 'default',
        enabled: true
    },
    {
        key: 'filesystem-readonly',
        name: 'Filesystem (Read Only)',
        description: 'Read-only access to the workspace directory',
        servers: [
            {
                name: 'filesystem',
                command: 'npx',
                args: ['-y', '@anthropic-ai/mcp-server-filesystem', '--read-only', '.'],
                enabled: true
            }
        ],
        category: 'development',
        enabled: true
    },
    {
        key: 'web-search',
        name: 'Web Search',
        description: 'Access to web search capabilities',
        servers: [
            {
                name: 'brave-search',
                command: 'npx',
                args: ['-y', '@anthropic-ai/mcp-server-brave-search'],
                env: { BRAVE_API_KEY: '' },
                enabled: true
            }
        ],
        category: 'research',
        enabled: true
    }
];

const getProfilesPath = (): string => {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    return path.join(configDir, 'mcp-server-profiles.json');
};

/**
 * Load MCP Server Profiles from disk or return defaults
 */
export const loadMCPServerProfiles = (): MCPServerProfile[] => {
    const filePath = getProfilesPath();
    try {
        if (!fs.existsSync(filePath)) {
            debug('No mcp-server-profiles.json found, using defaults');
            return DEFAULT_MCP_SERVER_PROFILES.map(p => ({ ...p, servers: [...p.servers] }));
        }
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            throw new Error('MCP server profiles must be an array');
        }
        debug(`Loaded ${parsed.length} MCP server profiles from ${filePath}`);
        return parsed as MCPServerProfile[];
    } catch (error) {
        debug('Failed to load MCP server profiles, using defaults:', error);
        return DEFAULT_MCP_SERVER_PROFILES.map(p => ({ ...p, servers: [...p.servers] }));
    }
};

/**
 * Save MCP Server Profiles to disk
 */
export const saveMCPServerProfiles = (profiles: MCPServerProfile[]): void => {
    const filePath = getProfilesPath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(profiles, null, 2));
    debug(`Saved ${profiles.length} MCP server profiles to ${filePath}`);
};

/**
 * Get a specific MCP Server Profile by key
 */
export const getMCPServerProfileByKey = (key: string): MCPServerProfile | undefined => {
    const normalized = key.trim().toLowerCase();
    return loadMCPServerProfiles().find(profile => profile.key.toLowerCase() === normalized);
};

/**
 * Get all MCP Server Profiles
 */
export const getMCPServerProfiles = (): MCPServerProfile[] => loadMCPServerProfiles();

/**
 * Add a new MCP Server Profile
 */
export const addMCPServerProfile = (profile: MCPServerProfile): void => {
    const profiles = loadMCPServerProfiles();
    const existingIndex = profiles.findIndex(p => p.key.toLowerCase() === profile.key.toLowerCase());
    if (existingIndex >= 0) {
        throw new Error(`MCP server profile with key "${profile.key}" already exists`);
    }
    profiles.push(profile);
    saveMCPServerProfiles(profiles);
};

/**
 * Update an existing MCP Server Profile
 */
export const updateMCPServerProfile = (key: string, updates: Partial<MCPServerProfile>): void => {
    const profiles = loadMCPServerProfiles();
    const index = profiles.findIndex(p => p.key.toLowerCase() === key.toLowerCase());
    if (index < 0) {
        throw new Error(`MCP server profile with key "${key}" not found`);
    }
    profiles[index] = { ...profiles[index], ...updates, key: profiles[index].key }; // Preserve key
    saveMCPServerProfiles(profiles);
};

/**
 * Delete an MCP Server Profile
 */
export const deleteMCPServerProfile = (key: string): void => {
    const profiles = loadMCPServerProfiles();
    const index = profiles.findIndex(p => p.key.toLowerCase() === key.toLowerCase());
    if (index < 0) {
        throw new Error(`MCP server profile with key "${key}" not found`);
    }
    profiles.splice(index, 1);
    saveMCPServerProfiles(profiles);
};

/**
 * Resolve MCP servers from a profile key or array of keys
 * Supports merging multiple profiles
 */
export const resolveMCPServers = (profileKeys: string | string[]): MCPServerConfig[] => {
    const keys = Array.isArray(profileKeys) ? profileKeys : [profileKeys];
    const allServers: MCPServerConfig[] = [];
    const seenNames = new Set<string>();

    for (const key of keys) {
        if (!key) continue;
        const profile = getMCPServerProfileByKey(key);
        if (profile && profile.enabled) {
            for (const server of profile.servers) {
                // Avoid duplicates by server name
                if (!seenNames.has(server.name)) {
                    seenNames.add(server.name);
                    allServers.push({ ...server });
                }
            }
        }
    }

    return allServers;
};
