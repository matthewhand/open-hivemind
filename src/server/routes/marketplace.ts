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
);

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
);

export default router;
