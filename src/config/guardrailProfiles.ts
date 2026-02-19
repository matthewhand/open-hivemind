import fs from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:guardrailProfiles');

export interface GuardrailProfile {
  key: string;
  name: string;
  description?: string;
  mcpGuard: {
    enabled: boolean;
    type: 'owner' | 'custom';
    allowedUserIds?: string[];
  };
}

const DEFAULT_GUARDRAIL_PROFILES: GuardrailProfile[] = [
  {
    key: 'open',
    name: 'Open',
    description: 'Allow MCP tools without restrictions',
    mcpGuard: {
      enabled: false,
      type: 'owner',
    },
  },
  {
    key: 'owner-only',
    name: 'Owner Only',
    description: 'Only the channel owner can use MCP tools',
    mcpGuard: {
      enabled: true,
      type: 'owner',
    },
  },
  {
    key: 'custom-list',
    name: 'Custom Allow List',
    description: 'Only approved user IDs can use MCP tools',
    mcpGuard: {
      enabled: true,
      type: 'custom',
      allowedUserIds: [],
    },
  },
];

const getProfilesPath = (): string => {
  const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
  return path.join(configDir, 'guardrail-profiles.json');
};

export const loadGuardrailProfiles = (): GuardrailProfile[] => {
  const filePath = getProfilesPath();
  try {
    if (!fs.existsSync(filePath)) {
      return DEFAULT_GUARDRAIL_PROFILES.map(profile => ({ ...profile, mcpGuard: { ...profile.mcpGuard } }));
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('guardrail profiles must be an array');
    }
    return parsed as GuardrailProfile[];
  } catch (error) {
    debug('Failed to load guardrail profiles, using defaults:', error);
    return DEFAULT_GUARDRAIL_PROFILES.map(profile => ({ ...profile, mcpGuard: { ...profile.mcpGuard } }));
  }
};

export const saveGuardrailProfiles = (profiles: GuardrailProfile[]): void => {
  const filePath = getProfilesPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(profiles, null, 2));
};

export const getGuardrailProfileByKey = (key: string): GuardrailProfile | undefined => {
  const normalized = key.trim().toLowerCase();
  return loadGuardrailProfiles().find(profile => profile.key.toLowerCase() === normalized);
};

export const getGuardrailProfiles = (): GuardrailProfile[] => loadGuardrailProfiles();
