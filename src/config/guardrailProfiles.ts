import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import type { McpGuardConfig } from '@src/types/config';

const debug = Debug('app:guardrailProfiles');

export interface GuardrailProfile {
  id: string;
  name: string;
  description?: string;
  guards: {
    mcpGuard: McpGuardConfig;
    rateLimit?: {
      enabled: boolean;
      maxRequests: number;
      windowMs: number;
    };
    contentFilter?: {
      enabled: boolean;
      strictness?: 'low' | 'medium' | 'high';
    };
  };
}

// Keep legacy interface for backward compatibility if needed, but we'll try to migrate
// Actually, let's just use the new interface.

const DEFAULT_GUARDRAIL_PROFILES: GuardrailProfile[] = [
  {
    id: 'open',
    name: 'Open',
    description: 'Allow MCP tools without restrictions',
    guards: {
      mcpGuard: {
        enabled: false,
        type: 'owner',
      },
      rateLimit: {
        enabled: false,
        maxRequests: 100,
        windowMs: 60000,
      },
      contentFilter: {
        enabled: false,
        strictness: 'low',
      },
    },
  },
  {
    id: 'owner-only',
    name: 'Owner Only',
    description: 'Only the channel owner can use MCP tools',
    guards: {
      mcpGuard: {
        enabled: true,
        type: 'owner',
      },
      rateLimit: {
        enabled: true,
        maxRequests: 50,
        windowMs: 60000,
      },
      contentFilter: {
        enabled: true,
        strictness: 'medium',
      },
    },
  },
  {
    id: 'strict',
    name: 'Strict Protection',
    description: 'Strict rate limiting and content filtering',
    guards: {
      mcpGuard: {
        enabled: true,
        type: 'custom',
        allowedUsers: [],
      },
      rateLimit: {
        enabled: true,
        maxRequests: 10,
        windowMs: 60000,
      },
      contentFilter: {
        enabled: true,
        strictness: 'high',
      },
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
      return DEFAULT_GUARDRAIL_PROFILES;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('guardrail profiles must be an array');
    }

    // Migrate old format if necessary (key -> id, mcpGuard -> guards.mcpGuard)
    return parsed.map((p: any) => {
      if (p.key && !p.id) {
        // Migration logic
        return {
          id: p.key,
          name: p.name,
          description: p.description,
          guards: {
            mcpGuard: p.mcpGuard || { enabled: false, type: 'owner' },
            rateLimit: { enabled: false, maxRequests: 100, windowMs: 60000 },
            contentFilter: { enabled: false, strictness: 'low' },
          }
        };
      }
      return p;
    }) as GuardrailProfile[];
  } catch (error) {
    debug('Failed to load guardrail profiles, using defaults:', error);
    return DEFAULT_GUARDRAIL_PROFILES;
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
  return loadGuardrailProfiles().find(profile => profile.id.toLowerCase() === normalized);
};

export const getGuardrailProfiles = (): GuardrailProfile[] => loadGuardrailProfiles();
