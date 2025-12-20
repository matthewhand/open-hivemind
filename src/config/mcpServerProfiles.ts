import * as fs from 'fs';
import * as path from 'path';
import Debug from 'debug';

const debug = Debug('app:mcpServerProfiles');

export interface McpServerConfig {
    name: string;
    serverUrl: string;
    apiKey?: string;
}

export interface McpServerProfile {
    key: string;
    name: string;
    description?: string;
    mcpServers: McpServerConfig[];
}

interface McpServerProfilesData {
    profiles: McpServerProfile[];
}

const CONFIG_DIR = path.join(process.cwd(), 'config');
const PROFILES_FILE = path.join(CONFIG_DIR, 'mcp-server-profiles.json');

let profilesCache: McpServerProfile[] | null = null;

function ensureConfigDir(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
}

function loadProfiles(): McpServerProfile[] {
    if (profilesCache) return profilesCache;

    try {
        if (fs.existsSync(PROFILES_FILE)) {
            const data = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8')) as McpServerProfilesData;
            profilesCache = Array.isArray(data.profiles) ? data.profiles : [];
            debug(`Loaded ${profilesCache.length} MCP server profiles`);
        } else {
            profilesCache = [];
            debug('No MCP server profiles file found, starting with empty list');
        }
    } catch (err) {
        debug('Error loading MCP server profiles:', err);
        profilesCache = [];
    }

    return profilesCache;
}

function saveProfiles(profiles: McpServerProfile[]): void {
    ensureConfigDir();
    const data: McpServerProfilesData = { profiles };
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(data, null, 2), 'utf-8');
    profilesCache = profiles;
    debug(`Saved ${profiles.length} MCP server profiles`);
}

export function getMcpServerProfiles(): McpServerProfile[] {
    return loadProfiles();
}

export function getMcpServerProfileByKey(key: string): McpServerProfile | undefined {
    return loadProfiles().find(p => p.key === key);
}

export function createMcpServerProfile(profile: McpServerProfile): McpServerProfile {
    const profiles = loadProfiles();

    if (profiles.some(p => p.key === profile.key)) {
        throw new Error(`Profile with key "${profile.key}" already exists`);
    }

    const newProfile: McpServerProfile = {
        key: profile.key.trim().toLowerCase().replace(/\s+/g, '-'),
        name: profile.name.trim(),
        description: profile.description?.trim() || undefined,
        mcpServers: Array.isArray(profile.mcpServers) ? profile.mcpServers : [],
    };

    profiles.push(newProfile);
    saveProfiles(profiles);
    return newProfile;
}

export function updateMcpServerProfile(key: string, updates: Partial<McpServerProfile>): McpServerProfile | null {
    const profiles = loadProfiles();
    const index = profiles.findIndex(p => p.key === key);

    if (index === -1) return null;

    const existing = profiles[index];
    const updated: McpServerProfile = {
        ...existing,
        name: updates.name?.trim() || existing.name,
        description: updates.description?.trim() || existing.description,
        mcpServers: Array.isArray(updates.mcpServers) ? updates.mcpServers : existing.mcpServers,
    };

    profiles[index] = updated;
    saveProfiles(profiles);
    return updated;
}

export function deleteMcpServerProfile(key: string): boolean {
    const profiles = loadProfiles();
    const index = profiles.findIndex(p => p.key === key);

    if (index === -1) return false;

    profiles.splice(index, 1);
    saveProfiles(profiles);
    return true;
}

export function reloadMcpServerProfiles(): void {
    profilesCache = null;
    loadProfiles();
}
