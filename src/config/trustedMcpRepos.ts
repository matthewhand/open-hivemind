import * as fs from 'fs';
import * as path from 'path';
import Debug from 'debug';

const debug = Debug('app:trustedMcpRepos');

export interface TrustedMcpRepository {
  owner: string;
  repo: string;
  name: string;
  description?: string;
  verified: boolean;
  addedAt?: string;
}

export interface TrustedMcpReposSettings {
  requireVerifiedForProduction: boolean;
  showTrustIndicator: boolean;
  defaultTrustLevel: 'trusted' | 'caution';
}

export interface TrustedMcpReposMetadata {
  lastUpdated?: string;
  version?: string;
}

export interface TrustedMcpReposConfig {
  trustedRepositories: TrustedMcpRepository[];
  cautionRepositories: TrustedMcpRepository[];
  settings: TrustedMcpReposSettings;
  metadata: TrustedMcpReposMetadata;
}

const TRUSTED_MCP_REPOS_FILE = path.join(process.cwd(), 'config', 'trusted-mcp-repos.json');

const DEFAULT_TRUSTED_MCP_REPOS_CONFIG: TrustedMcpReposConfig = {
  trustedRepositories: [],
  cautionRepositories: [],
  settings: {
    requireVerifiedForProduction: false,
    showTrustIndicator: true,
    defaultTrustLevel: 'caution',
  },
  metadata: {},
};

function normalizeRepository(value: unknown): TrustedMcpRepository | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<TrustedMcpRepository>;
  if (!candidate.owner || !candidate.repo || !candidate.name) {
    return null;
  }

  return {
    owner: String(candidate.owner),
    repo: String(candidate.repo),
    name: String(candidate.name),
    description: candidate.description ? String(candidate.description) : undefined,
    verified: Boolean(candidate.verified),
    addedAt: candidate.addedAt ? String(candidate.addedAt) : undefined,
  };
}

function normalizeRepositories(value: unknown): TrustedMcpRepository[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeRepository).filter((repo): repo is TrustedMcpRepository => repo !== null);
}

export function getTrustedMcpReposConfig(): TrustedMcpReposConfig {
  try {
    if (!fs.existsSync(TRUSTED_MCP_REPOS_FILE)) {
      return { ...DEFAULT_TRUSTED_MCP_REPOS_CONFIG };
    }

    const raw = JSON.parse(fs.readFileSync(TRUSTED_MCP_REPOS_FILE, 'utf-8')) as Partial<TrustedMcpReposConfig>;
    const defaultTrustLevel = raw.settings?.defaultTrustLevel === 'trusted' ? 'trusted' : 'caution';

    return {
      trustedRepositories: normalizeRepositories(raw.trustedRepositories),
      cautionRepositories: normalizeRepositories(raw.cautionRepositories),
      settings: {
        requireVerifiedForProduction: Boolean(raw.settings?.requireVerifiedForProduction),
        showTrustIndicator: raw.settings?.showTrustIndicator !== false,
        defaultTrustLevel,
      },
      metadata: {
        lastUpdated: raw.metadata?.lastUpdated,
        version: raw.metadata?.version,
      },
    };
  } catch (error) {
    debug('Failed to load trusted MCP repositories config: %O', error);
    return { ...DEFAULT_TRUSTED_MCP_REPOS_CONFIG };
  }
}
