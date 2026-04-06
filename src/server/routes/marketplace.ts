import * as fs from 'fs';
import * as path from 'path';
import Debug from 'debug';
import { Router } from 'express';
import { configLimiter } from '@src/middleware/rateLimiter';
import type { PluginManifest } from '@src/plugins/PluginLoader';
import {
  installPlugin,
  listInstalledPlugins,
  uninstallPlugin,
  updatePlugin,
} from '@src/plugins/PluginManager';
import { authenticateToken, requireRole } from '@src/server/middleware/auth';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { asyncErrorHandler } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../types/constants';
import { EmptySchema, MarketplacePluginNameParamSchema } from '../../validation/schemas/miscSchema';
import { validateRequest } from '../../validation/validateRequest';

const debug = Debug('app:marketplace');
const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketplacePackage {
  name: string;
  displayName: string;
  description: string;
  type: 'llm' | 'message' | 'memory' | 'tool' | 'bot' | 'guard' | 'persona';
  version: string;
  status: 'built-in' | 'installed' | 'available';
  trusted: boolean;
  repoUrl?: string;
  installedAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Package Discovery
// ---------------------------------------------------------------------------

const PACKAGES_DIR = path.resolve(__dirname, '../../../../packages');
const _PLUGINS_DIR = path.resolve(__dirname, '../../../../plugins');
const COMMUNITY_CONFIG_PATH = path.resolve(__dirname, '../../../../config/community.json');

const GITHUB_TOPIC = 'open-hivemind-plugin';
const TRUSTED_REPO = 'matthewhand/open-hivemind'; // Only this specific repo is trusted
const GITHUB_SEARCH_CACHE_TTL = 300_000; // 5 minutes
let githubSearchCache: MarketplacePackage[] | null = null;
let githubSearchCacheTime = 0;

/**
 * Load the allowlist of visible packages from config/community.json.
 * Returns null if the file doesn't exist (show all packages).
 */
function loadCommunityAllowlist(): Set<string> | null {
  try {
    if (!fs.existsSync(COMMUNITY_CONFIG_PATH)) return null;
    const data = JSON.parse(fs.readFileSync(COMMUNITY_CONFIG_PATH, 'utf8'));
    if (Array.isArray(data.packages)) {
      return new Set(data.packages as string[]);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Search GitHub for public repos tagged with the open-hivemind-plugin topic.
 * Results are cached for 5 minutes. No auth token needed for public repos.
 */
async function searchGitHubPackages(): Promise<MarketplacePackage[]> {
  const now = Date.now();
  if (githubSearchCache && now - githubSearchCacheTime < GITHUB_SEARCH_CACHE_TTL) {
    return githubSearchCache;
  }

  try {
    const url = `https://api.github.com/search/repositories?q=topic:${GITHUB_TOPIC}&sort=updated&per_page=50`;
    const response = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'open-hivemind' },
    });

    if (!response.ok) {
      debug('GitHub search failed: %d %s', response.status, response.statusText);
      return githubSearchCache || [];
    }

    const data = await response.json() as any;
    const repos = data.items || [];

    const packages: MarketplacePackage[] = repos.map((repo: any) => {
      const fullName = repo.full_name || '';
      const isTrusted = fullName.toLowerCase() === TRUSTED_REPO.toLowerCase();

      // Guess package type from repo name prefix
      const repoName = repo.name || '';
      const namePrefix = repoName.split('-')[0];
      const validTypes = ['llm', 'message', 'memory', 'tool'] as const;
      const type = validTypes.includes(namePrefix as any)
        ? (namePrefix as MarketplacePackage['type'])
        : 'tool';

      return {
        name: repoName,
        displayName: repo.name?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || repoName,
        description: repo.description || 'No description',
        type,
        version: '0.0.0',
        status: 'available' as const,
        trusted: isTrusted,
        repoUrl: repo.html_url,
      };
    });

    githubSearchCache = packages;
    githubSearchCacheTime = now;
    debug('GitHub search found %d repos with topic "%s"', packages.length, GITHUB_TOPIC);
    return packages;
  } catch (error) {
    debug('GitHub search error: %s', error);
    return githubSearchCache || [];
  }
}

/**
 * Scan built-in packages directory for available providers.
 */
async function scanBuiltInPackages(): Promise<MarketplacePackage[]> {
  const packages: MarketplacePackage[] = [];

  try {
    const dirs = await fs.promises.readdir(PACKAGES_DIR, { withFileTypes: true });
    const packageDirs = dirs.filter((d) => d.isDirectory()).map((d) => d.name);

    for (const dir of packageDirs) {
      const pkgPath = path.join(PACKAGES_DIR, dir);
      const pkgJsonPath = path.join(pkgPath, 'package.json');

      try {
        const pkgJsonContent = await fs.promises.readFile(pkgJsonPath, 'utf-8');
        const pkgJson = JSON.parse(pkgJsonContent);
        const indexPath = path.join(pkgPath, 'src', 'index.ts');

        // Try to load manifest from the package
        let manifest: PluginManifest | undefined;
        try {
          await fs.promises.access(indexPath);
          // Clear require cache to get fresh manifest
          delete require.cache[require.resolve(indexPath)];
          const mod = require(indexPath);
          manifest = mod.manifest;
        } catch (e) {
          debug('Could not load manifest from %s: %s', dir, e);
        }

        // Derive type from package name prefix
        const namePrefix = dir.split('-')[0];
        const validTypes = ['llm', 'message', 'memory', 'tool'] as const;
        const type = validTypes.includes(namePrefix as any)
          ? (namePrefix as MarketplacePackage['type'])
          : 'tool';

        packages.push({
          name: dir,
          displayName: manifest?.displayName || pkgJson.name || dir,
          description: manifest?.description || pkgJson.description || 'No description available',
          type: manifest?.type || type,
          version: pkgJson.version || '0.0.0',
          status: 'built-in',
          trusted: true,
        });
      } catch (e: any) {
        if (e.code !== 'ENOENT') {
          debug('Failed to read package %s: %s', dir, e);
        }
      }
    }
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      debug('Failed to read packages directory: %s', e);
    } else {
      debug('packages/ directory not found');
    }
  }

  return packages;
}

/**
 * Get installed community plugins.
 */
async function getInstalledPlugins(): Promise<MarketplacePackage[]> {
  const plugins: MarketplacePackage[] = [];

  try {
    const installed = await listInstalledPlugins();

    for (const plugin of installed) {
      // Packages from matthewhand/open-hivemind are trusted
      const isTrusted = !!(
        plugin.repoUrl && /github\.com\/matthewhand\/open-hivemind/i.test(plugin.repoUrl)
      );
      plugins.push({
        name: plugin.name,
        displayName: plugin.manifest.displayName,
        description: plugin.manifest.description,
        type: plugin.manifest.type,
        version: plugin.version,
        status: 'installed',
        trusted: isTrusted,
        repoUrl: plugin.repoUrl,
        installedAt: plugin.installedAt,
        updatedAt: plugin.updatedAt,
      });
    }
  } catch (e) {
    debug('Failed to list installed plugins: %s', e);
  }

  return plugins;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// All marketplace routes require authentication
router.use(authenticateToken);

// ⚡ Bolt Optimization: Cache expensive file system reads and module loading
let cachedPackages: MarketplacePackage[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

async function getPackages(): Promise<MarketplacePackage[]> {
  const now = Date.now();

  // Return cached result if still valid
  if (cachedPackages && now - cacheTimestamp < CACHE_TTL_MS) {
    debug(
      'Returning cached packages (%d items, age: %dms)',
      cachedPackages.length,
      now - cacheTimestamp
    );
    return cachedPackages;
  }

  // Cache miss or expired - scan filesystem + GitHub
  debug('Cache miss or expired, scanning packages + GitHub');
  const builtIn = await scanBuiltInPackages();
  const installed = await getInstalledPlugins();
  const githubAvailable = await searchGitHubPackages();

  // Merge: built-in > installed > GitHub available (first wins)
  const packageMap = new Map<string, MarketplacePackage>();

  // GitHub repos go first (lowest priority — overwritten by local)
  for (const pkg of githubAvailable) {
    packageMap.set(pkg.name, pkg);
  }
  // Then built-in and installed (higher priority, overwrites GitHub)
  for (const pkg of [...builtIn, ...installed]) {
    packageMap.set(pkg.name, pkg);
  }

  let allPackages = Array.from(packageMap.values());

  // Filter by community.json allowlist (if it exists)
  const allowlist = loadCommunityAllowlist();
  if (allowlist) {
    allPackages = allPackages.filter(
      (pkg) => allowlist.has(pkg.name) || pkg.status === 'installed'
    );
  }

  cachedPackages = allPackages;
  cacheTimestamp = now;

  return cachedPackages;
}

function invalidateCache(): void {
  debug('Invalidating marketplace cache');
  cachedPackages = null;
  cacheTimestamp = 0;
}

/**
 * GET /api/marketplace/packages
 * List all available packages (built-in + installed)
 */
router.get(
  '/packages',
  asyncErrorHandler(async (req, res) => {
    try {
      const packages = await getPackages();
      debug('Returning %d packages', packages.length);

      return res.json(ApiResponse.success(packages));
    } catch (err: any) {
      debug('Error listing packages: %s', err);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to list packages'));
    }
  })
);

/**
 * GET /api/marketplace/packages/:name
 * Get single package details
 */
router.get(
  '/packages/:name',
  asyncErrorHandler(async (req, res) => {
    try {
      const name = req.params.name;
      const packages = await getPackages();

      const pkg = packages.find((p) => p.name === name);

      if (!pkg) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Package not found'));
      }

      return res.json(ApiResponse.success(pkg));
    } catch (err: any) {
      debug('Error getting package: %s', err);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to get package'));
    }
  })
);

/**
 * POST /api/marketplace/install
 * Install a community plugin from GitHub URL
 * Body: { repoUrl: string }
 */
router.post(
  '/install',
  configLimiter,
  requireRole('admin'),
  validateRequest(EmptySchema),
  async (req, res) => {
    try {
      const { repoUrl } = req.body;

      if (!repoUrl || typeof repoUrl !== 'string') {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(ApiResponse.error('Missing or invalid repoUrl'));
      }

      debug('Installing plugin from %s', repoUrl);

      const plugin = await installPlugin(repoUrl);

      // ⚡ Bolt Optimization: Invalidate cache after install
      invalidateCache();

      return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success());
    } catch (err: any) {
      debug('Install error: %s', err);
      return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Installation failed'));
    }
  }
);

/**
 * POST /api/marketplace/uninstall/:name
 * Uninstall a community plugin
 */
router.post(
  '/uninstall/:name',
  configLimiter,
  requireRole('admin'),
  validateRequest(MarketplacePluginNameParamSchema),
  async (req, res) => {
    try {
      const name = req.params.name;

      debug('Uninstalling plugin %s', name);

      await uninstallPlugin(name);

      // ⚡ Bolt Optimization: Invalidate cache after uninstall
      invalidateCache();

      return res.json(ApiResponse.success());
    } catch (err: any) {
      debug('Uninstall error: %s', err);
      return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Uninstall failed'));
    }
  }
);

/**
 * POST /api/marketplace/update/:name
 * Update a community plugin to latest version
 */
router.post(
  '/update/:name',
  configLimiter,
  requireRole('admin'),
  validateRequest(MarketplacePluginNameParamSchema),
  async (req, res) => {
    try {
      const name = req.params.name;

      debug('Updating plugin %s', name);

      const plugin = await updatePlugin(name);

      // ⚡ Bolt Optimization: Invalidate cache after update
      invalidateCache();

      return res.json(ApiResponse.success());
    } catch (err: any) {
      debug('Update error: %s', err);
      return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Update failed'));
    }
  }
);

export default router;
