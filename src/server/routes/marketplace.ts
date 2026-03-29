import * as fs from 'fs';
import * as path from 'path';
import Debug from 'debug';
import { Router } from 'express';
import type { PluginManifest } from '@src/plugins/PluginLoader';
import {
  installPlugin,
  listInstalledPlugins,
  uninstallPlugin,
  updatePlugin,
} from '@src/plugins/PluginManager';
import { authenticateToken, requireRole } from '@src/server/middleware/auth';
import {
  InstallPluginSchema,
  PluginNameParamSchema,
} from '../../validation/schemas/marketplaceSchema';
import { validateRequest } from '../../validation/validateRequest';
import { checkForUpdates, type VersionHistoryEntry } from '../utils/versionTracking';
import { PLUGINS_DIR } from '@src/plugins/PluginLoader';

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
  latestVersion?: string;
  hasUpdate?: boolean;
  status: 'built-in' | 'installed' | 'available';
  repoUrl?: string;
  downloadUrl?: string;
  author?: string;
  tags?: string[];
  requirements?: {
    node?: string;
  };
  installedAt?: string;
  updatedAt?: string;
  changelog?: VersionHistoryEntry[];
}

// ---------------------------------------------------------------------------
// Package Discovery
// ---------------------------------------------------------------------------

const PACKAGES_DIR = path.resolve(__dirname, '../../../../packages');
const _PLUGINS_DIR = path.resolve(__dirname, '../../../../plugins');
const COMMUNITY_MANIFEST = path.resolve(__dirname, '../data/community-packages.json');

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
        const validTypes = ['llm', 'message', 'memory', 'tool', 'bot', 'guard', 'persona'] as const;
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
 * Get installed community plugins with version update checking.
 */
async function getInstalledPlugins(): Promise<MarketplacePackage[]> {
  const plugins: MarketplacePackage[] = [];

  try {
    const installed = await listInstalledPlugins();

    for (const plugin of installed) {
      // Check for updates asynchronously
      const pluginPath = path.join(PLUGINS_DIR, plugin.name);
      let versionInfo;

      try {
        versionInfo = await checkForUpdates(pluginPath, plugin.version, plugin.repoUrl);
      } catch (e) {
        debug('Failed to check updates for %s: %s', plugin.name, e);
      }

      plugins.push({
        name: plugin.name,
        displayName: plugin.manifest.displayName,
        description: plugin.manifest.description,
        type: plugin.manifest.type,
        version: plugin.version,
        latestVersion: versionInfo?.latest,
        hasUpdate: versionInfo?.hasUpdate || false,
        status: 'installed',
        repoUrl: plugin.repoUrl,
        installedAt: plugin.installedAt,
        updatedAt: plugin.updatedAt,
        changelog: versionInfo?.changelog,
      });
    }
  } catch (e) {
    debug('Failed to list installed plugins: %s', e);
  }

  return plugins;
}

/**
 * Load available community packages from manifest file.
 *
 * Future enhancement: Add support for fetching from a remote registry URL
 * by checking an environment variable (e.g., REGISTRY_URL) and falling back
 * to the local manifest file if unavailable.
 */
async function getAvailablePackages(): Promise<MarketplacePackage[]> {
  const packages: MarketplacePackage[] = [];

  try {
    const manifestContent = await fs.promises.readFile(COMMUNITY_MANIFEST, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    if (Array.isArray(manifest)) {
      packages.push(...manifest);
      debug('Loaded %d available packages from manifest', manifest.length);
    }
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      debug('Community packages manifest not found at %s', COMMUNITY_MANIFEST);
    } else {
      debug('Failed to load community packages manifest: %s', e);
    }
  }

  return packages;
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

  // Cache miss or expired - scan filesystem and load manifests
  debug('Cache miss or expired, scanning packages');
  const builtIn = await scanBuiltInPackages();
  const installed = await getInstalledPlugins();
  const available = await getAvailablePackages();

  // Merge packages with priority: built-in > installed > available
  // This ensures built-in packages override community versions,
  // and installed plugins override available ones
  const packageMap = new Map<string, MarketplacePackage>();

  // First add available packages
  for (const pkg of available) {
    packageMap.set(pkg.name, pkg);
  }

  // Override with installed packages
  for (const pkg of installed) {
    packageMap.set(pkg.name, pkg);
  }

  // Override with built-in packages (highest priority)
  for (const pkg of builtIn) {
    packageMap.set(pkg.name, pkg);
  }

  cachedPackages = Array.from(packageMap.values());
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
router.get('/packages', async (req, res) => {
  try {
    const packages = await getPackages();
    debug('Returning %d packages', packages.length);

    return res.json(packages);
  } catch (err: any) {
    debug('Error listing packages: %s', err);
    return res.status(500).json({ error: 'Failed to list packages', message: err.message });
  }
});

/**
 * GET /api/marketplace/packages/:name
 * Get single package details
 */
router.get('/packages/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const packages = await getPackages();

    const pkg = packages.find((p) => p.name === name);

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    return res.json(pkg);
  } catch (err: any) {
    debug('Error getting package: %s', err);
    return res.status(500).json({ error: 'Failed to get package', message: err.message });
  }
});

/**
 * POST /api/marketplace/install
 * Install a community plugin from GitHub URL
 * Body: { repoUrl: string }
 */
router.post(
  '/install',
  requireRole('admin'),
  validateRequest(InstallPluginSchema),
  async (req, res) => {
    try {
      const { repoUrl } = req.body;

      debug('Installing plugin from %s', repoUrl);

      const plugin = await installPlugin(repoUrl);

      // ⚡ Bolt Optimization: Invalidate cache after install
      invalidateCache();

    return res.status(201).json({
      success: true,
      package: {
        name: plugin.name,
        displayName: plugin.manifest.displayName,
        description: plugin.manifest.description,
        type: plugin.manifest.type,
        version: plugin.version,
        status: 'installed' as const,
        repoUrl: plugin.repoUrl,
        installedAt: plugin.installedAt,
        updatedAt: plugin.updatedAt,
      },
    });
  } catch (err: any) {
    debug('Install error: %s', err);

    // Enhanced error response with actionable information
    const errorMessage = err.message || 'Installation failed';
    let statusCode = 400;
    let errorType = 'marketplace_install_failed';
    const suggestions: string[] = [];

    // Detect specific error types
    if (errorMessage.includes('git') || errorMessage.includes('clone') || errorMessage.includes('repository')) {
      errorType = 'marketplace_git_error';
      suggestions.push('Verify the GitHub repository URL is correct and accessible');
      suggestions.push('Check if the repository is public or you have access');
      suggestions.push('Ensure your server has internet connectivity');
    } else if (errorMessage.includes('build') || errorMessage.includes('compile') || errorMessage.includes('npm')) {
      errorType = 'marketplace_build_failed';
      suggestions.push('Check the package build logs for specific errors');
      suggestions.push('The package may have missing or incompatible dependencies');
      suggestions.push('Report the issue to the package maintainer');
      statusCode = 500;
    } else if (errorMessage.includes('manifest') || errorMessage.includes('validation')) {
      errorType = 'validation_error';
      suggestions.push('The package structure may be invalid');
      suggestions.push('Ensure the package has a valid manifest.json');
      suggestions.push('Contact the package author for support');
    } else if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      errorType = 'network_error';
      statusCode = 503;
      suggestions.push('Check your internet connection');
      suggestions.push('Verify firewall settings allow outbound connections');
      suggestions.push('Try again in a few moments');
    }

    // Add generic suggestions if none were added
    if (suggestions.length === 0) {
      suggestions.push('Check the repository URL is correct');
      suggestions.push('Try again or refresh the page');
      suggestions.push('Contact support if the issue persists');
    }

    return res.status(statusCode).json({
      error: 'Installation failed',
      message: errorMessage,
      errorType,
      suggestions,
      canRetry: statusCode === 503 || errorType === 'network_error' || errorType === 'marketplace_git_error',
      docsUrl: 'https://docs.open-hivemind.ai/marketplace/troubleshooting',
    });
  }
);

/**
 * POST /api/marketplace/uninstall/:name
 * Uninstall a community plugin
 */
router.post(
  '/uninstall/:name',
  requireRole('admin'),
  validateRequest(PluginNameParamSchema),
  async (req, res) => {
    try {
      const name = req.params.name;

      debug('Uninstalling plugin %s', name);

      await uninstallPlugin(name);

      // ⚡ Bolt Optimization: Invalidate cache after uninstall
      invalidateCache();

      return res.json({ success: true, message: `Plugin ${name} uninstalled` });
    } catch (err: any) {
      debug('Uninstall error: %s', err);
      return res.status(400).json({ error: 'Uninstall failed', message: err.message });
    }
  }
);

/**
 * POST /api/marketplace/update/:name
 * Update a community plugin to latest version
 */
router.post(
  '/update/:name',
  requireRole('admin'),
  validateRequest(PluginNameParamSchema),
  async (req, res) => {
    try {
      const name = req.params.name;

      debug('Updating plugin %s', name);

      const plugin = await updatePlugin(name);

      // ⚡ Bolt Optimization: Invalidate cache after update
      invalidateCache();

      return res.json({
        success: true,
        package: {
          name: plugin.name,
          displayName: plugin.manifest.displayName,
          description: plugin.manifest.description,
          type: plugin.manifest.type,
          version: plugin.version,
          status: 'installed' as const,
          repoUrl: plugin.repoUrl,
          installedAt: plugin.installedAt,
          updatedAt: plugin.updatedAt,
        },
      });
    } catch (err: any) {
      debug('Update error: %s', err);
      return res.status(400).json({ error: 'Update failed', message: err.message });
    }
  }
);

/**
 * GET /api/marketplace/check-updates/:name
 * Check for available updates for a specific package
 */
router.get('/check-updates/:name', validateRequest(PluginNameParamSchema), async (req, res) => {
  try {
    const name = req.params.name;
    const pluginPath = path.join(PLUGINS_DIR, name);

    // Verify plugin exists
    try {
      await fs.promises.access(pluginPath);
    } catch {
      return res.status(404).json({ error: 'Plugin not found' });
    }

    // Get current version
    const pkgJsonPath = path.join(pluginPath, 'package.json');
    const pkgJsonContent = await fs.promises.readFile(pkgJsonPath, 'utf-8');
    const pkgJson = JSON.parse(pkgJsonContent);
    const currentVersion = pkgJson.version || '0.0.0';

    // Get registry info for repoUrl
    const installed = await listInstalledPlugins();
    const plugin = installed.find(p => p.name === name);

    // Check for updates
    const versionInfo = await checkForUpdates(pluginPath, currentVersion, plugin?.repoUrl);

    return res.json({
      name,
      current: versionInfo.current,
      latest: versionInfo.latest,
      hasUpdate: versionInfo.hasUpdate,
      changelog: versionInfo.changelog,
    });
  } catch (err: any) {
    debug('Check updates error: %s', err);
    return res.status(500).json({ error: 'Failed to check updates', message: err.message });
  }
});

/**
 * GET /api/marketplace/check-all-updates
 * Check for updates across all installed plugins
 */
router.get('/check-all-updates', async (req, res) => {
  try {
    const installed = await listInstalledPlugins();
    const updates: Array<{
      name: string;
      displayName: string;
      current: string;
      latest?: string;
      hasUpdate: boolean;
    }> = [];

    for (const plugin of installed) {
      const pluginPath = path.join(PLUGINS_DIR, plugin.name);

      try {
        const versionInfo = await checkForUpdates(pluginPath, plugin.version, plugin.repoUrl);

        updates.push({
          name: plugin.name,
          displayName: plugin.manifest.displayName,
          current: versionInfo.current,
          latest: versionInfo.latest,
          hasUpdate: versionInfo.hasUpdate,
        });
      } catch (e) {
        debug('Failed to check updates for %s: %s', plugin.name, e);
      }
    }

    return res.json({
      total: installed.length,
      updatesAvailable: updates.filter(u => u.hasUpdate).length,
      packages: updates,
    });
  } catch (err: any) {
    debug('Check all updates error: %s', err);
    return res.status(500).json({ error: 'Failed to check updates', message: err.message });
  }
});

export default router;
