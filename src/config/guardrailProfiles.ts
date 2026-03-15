import type { McpGuardConfig, ContentFilterConfig } from '@src/types/config';
import { loadProfiles, saveProfiles, findProfileByKey } from './profileUtils';

export interface GuardrailProfile {
  id: string;
  name: string;
  description?: string;
  guards: any | {
    mcpGuard: McpGuardConfig;
    rateLimit?: {
      enabled: boolean;
      maxRequests: number;
      windowMs: number;
    };
    contentFilter?: ContentFilterConfig;
  };
}

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

export const loadGuardrailProfiles = (): GuardrailProfile[] => {
  return loadProfiles<GuardrailProfile[]>({
    filename: 'guardrail-profiles.json',
    defaultData: DEFAULT_GUARDRAIL_PROFILES,
    profileType: 'guardrail',
    validateAndMigrate: (parsed) => {
      if (!Array.isArray(parsed)) {
        throw new Error('guardrail profiles must be an array');
      }

      // Migrate old format if necessary (key -> id, mcpGuard -> guards.mcpGuard)
      return parsed.map((p: any) => {
        if (p.key && !p.id) {
          // Migration logic - validate required fields
          if (!p.name || typeof p.name !== 'string') {
            throw new Error(`Invalid profile: name is required for migration of profile with key "${p.key}"`);
          }
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
        // Validate new format profiles
        if (!p.id || typeof p.id !== 'string' || !p.name || typeof p.name !== 'string' || !p.guards) {
          throw new Error(`Invalid profile: id, name, and guards are required`);
        }
        return p;
      }) as GuardrailProfile[];
    },
  });
};

export const saveGuardrailProfiles = (profiles: GuardrailProfile[]): void => {
  saveProfiles('guardrail-profiles.json', profiles);
};

export const getGuardrailProfileByKey = (key: string): GuardrailProfile | undefined => {
  const profiles = loadGuardrailProfiles();
  return findProfileByKey(profiles, 'id', key);
};

export const getGuardrailProfiles = (): GuardrailProfile[] => loadGuardrailProfiles();
