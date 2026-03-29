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

const debug = Debug('app:marketplace');
const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketplacePackage {
  name: string;
  displayName: string;
  description: string;
  type: 'llm' | 'message' | 'memory' | 'tool';
  version: string;
  status: 'built-in' | 'installed' | 'available';
  repoUrl?: string;
  installedAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Package Discovery
// ---------------------------------------------------------------------------

const PACKAGES_DIR = path.resolve(__dirname, '../../../../packages');
const _PLUGINS_DIR = path.resolve(__dirname, '../../../../plugins');

/**
 * Scan built-in packages directory for available providers.
 */
function scanBuiltInPackages(): MarketplacePackage[] {
  const packages: MarketplacePackage[] = [];

  if (!fs.existsSync(PACKAGES_DIR)) {
    debug('packages/ directory not found');
    return packages;
  }

  const dirs = fs
    .readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const dir of dirs) {
    const pkgPath = path.join(PACKAGES_DIR, dir);
    const pkgJsonPath = path.join(pkgPath, 'package.json');

    if (!fs.existsSync(pkgJsonPath)) continue;

    try {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      const indexPath = path.join(pkgPath, 'src', 'index.ts');

      // Try to load manifest from the package
      let manifest: PluginManifest | undefined;
      if (fs.existsSync(indexPath)) {
        try {
          // Clear require cache to get fresh manifest
          delete require.cache[require.resolve(indexPath)];
          const mod = require(indexPath);
          manifest = mod.manifest;
        } catch (e) {
          debug('Could not load manifest from %s: %s', dir, e);
        }
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
      });
    } catch (e) {
      debug('Failed to read package %s: %s', dir, e);
    }
  }

  return packages;
}

/**
 * Get installed community plugins.
 */
function getInstalledPlugins(): MarketplacePackage[] {
  const plugins: MarketplacePackage[] = [];

  try {
    const installed = listInstalledPlugins();

    for (const plugin of installed) {
      plugins.push({
        name: plugin.name,
        displayName: plugin.manifest.displayName,
        description: plugin.manifest.description,
        type: plugin.manifest.type,
        version: plugin.version,
        status: 'installed',
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

/**
 * GET /api/marketplace/packages
 * List all available packages (built-in + installed)
 */
router.get('/packages', (req, res) => {
  try {
    const builtIn = scanBuiltInPackages();
    const installed = getInstalledPlugins();

    // Merge: built-in packages take precedence, then installed plugins
    const packageMap = new Map<string, MarketplacePackage>();

    for (const pkg of [...builtIn, ...installed]) {
      packageMap.set(pkg.name, pkg);
    }

    const packages = Array.from(packageMap.values());
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
router.get('/packages/:name', (req, res) => {
  try {
    const name = req.params.name;
    const builtIn = scanBuiltInPackages();
    const installed = getInstalledPlugins();

    const pkg = [...installed, ...builtIn].find((p) => p.name === name);

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
router.post('/install', requireRole('admin'), async (req, res) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl || typeof repoUrl !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid repoUrl' });
    }

    debug('Installing plugin from %s', repoUrl);

    const plugin = await installPlugin(repoUrl);

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
    return res.status(400).json({ error: 'Installation failed', message: err.message });
  }
});

/**
 * POST /api/marketplace/uninstall/:name
 * Uninstall a community plugin
 */
router.post('/uninstall/:name', requireRole('admin'), async (req, res) => {
  try {
    const name = req.params.name;

    debug('Uninstalling plugin %s', name);

    await uninstallPlugin(name);

    return res.json({ success: true, message: `Plugin ${name} uninstalled` });
  } catch (err: any) {
    debug('Uninstall error: %s', err);
    return res.status(400).json({ error: 'Uninstall failed', message: err.message });
  }
});

/**
 * POST /api/marketplace/update/:name
 * Update a community plugin to latest version
 */
router.post('/update/:name', requireRole('admin'), async (req, res) => {
  try {
    const name = req.params.name;

    debug('Updating plugin %s', name);

    const plugin = await updatePlugin(name);

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
});

export default router;
