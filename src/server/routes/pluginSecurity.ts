import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { authenticate, requireAdmin } from '../../auth/middleware';
import { ErrorUtils } from '../../common/ErrorUtils';
import { loadPlugin } from '../../plugins/PluginLoader';
import { getPluginSecurityStatus, getSecurityPolicy } from '../../plugins/PluginManager';
import type { SecurePluginManifest } from '../../plugins/PluginSecurity';
import { asyncErrorHandler } from '../../middleware/errorHandler';

const router = Router();
const debug = Debug('app:routes:pluginSecurity');

const isTestEnv = process.env.NODE_ENV === 'test';

// Apply authentication middleware to all plugin security routes (skip in tests)
if (!isTestEnv) {
  router.use(authenticate, requireAdmin);
}

/**
 * @openapi
 * /api/admin/plugins/security:
 *   get:
 *     summary: Get security status for all plugins
 *     tags: [Admin, Plugins]
 *     responses:
 *       200:
 *         description: List of plugin security statuses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     plugins:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           pluginName:
 *                             type: string
 *                           trustLevel:
 *                             type: string
 *                             enum: [trusted, untrusted]
 *                           isBuiltIn:
 *                             type: boolean
 *                           signatureValid:
 *                             type: boolean
 *                             nullable: true
 *                           grantedCapabilities:
 *                             type: array
 *                             items:
 *                               type: string
 *                           deniedCapabilities:
 *                             type: array
 *                             items:
 *                               type: string
 *                           requiredCapabilities:
 *                             type: array
 *                             items:
 *                               type: string
 *                 message:
 *                   type: string
 */
router.get('/security', (req: Request, res: Response) => {
  try {
    const plugins = getPluginSecurityStatus();
    debug('Retrieved security status for %d plugins', plugins.length);

    return res.json({
      success: true,
      data: { plugins },
      message: 'Plugin security status retrieved successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error retrieving plugin security status:', hivemindError);
    return res.status(500).json({
      error: 'Failed to retrieve plugin security status',
      message: hivemindError.message || 'An error occurred while retrieving plugin security status',
    });
  }
});

/**
 * @openapi
 * /api/admin/plugins/:name/verify:
 *   post:
 *     summary: Re-verify a plugin's signature
 *     tags: [Admin, Plugins]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Plugin name
 *     responses:
 *       200:
 *         description: Plugin verified successfully
 *       404:
 *         description: Plugin not found
 *       500:
 *         description: Verification failed
 */
router.post('/:name/verify', asyncErrorHandler(async (req, res) => {
  try {
    const { name } = req.params;
    debug('Verifying plugin: %s', name);

    // Load the plugin to get its manifest
    const mod = await loadPlugin(name);
    const manifest = mod.manifest as SecurePluginManifest;

    if (!manifest) {
      return res.status(404).json({
        error: 'Plugin not found',
        message: `Plugin '${name}' does not have a manifest`,
      });
    }

    // Re-verify the plugin
    const policy = getSecurityPolicy();
    const trustLevel = policy.verifyAndSetTrust(name, manifest);

    const status = policy.getPluginSecurityStatus(name);

    debug('Plugin %s verified with trust level: %s', name, trustLevel);

    return res.json({
      success: true,
      data: { trustLevel, status },
      message: `Plugin '${name}' verified successfully`,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error verifying plugin %s:', req.params.name, hivemindError);
    return res.status(500).json({
      error: 'Failed to verify plugin',
      message: hivemindError.message || 'An error occurred while verifying the plugin',
    });
  }
}));

/**
 * @openapi
 * /api/admin/plugins/:name/trust:
 *   post:
 *     summary: Manually trust a plugin
 *     tags: [Admin, Plugins]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Plugin name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trust:
 *                 type: boolean
 *                 description: Whether to trust the plugin
 *               capabilities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Capabilities to grant
 *     responses:
 *       200:
 *         description: Plugin trust updated successfully
 *       404:
 *         description: Plugin not found
 *       500:
 *         description: Update failed
 */
router.post('/:name/trust', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { trust, capabilities } = req.body;

    debug('Updating trust for plugin %s: trust=%s, capabilities=%o', name, trust, capabilities);

    const policy = getSecurityPolicy();
    const status = policy.getPluginSecurityStatus(name);

    if (!status) {
      return res.status(404).json({
        error: 'Plugin not found',
        message: `Plugin '${name}' not found in security policy`,
      });
    }

    // If trust is false, revoke all capabilities
    if (trust === false) {
      // Revoke all granted capabilities
      for (const cap of status.grantedCapabilities) {
        policy.revokeCapability(name, cap);
      }
    } else if (capabilities && Array.isArray(capabilities)) {
      // Grant requested capabilities
      for (const cap of capabilities) {
        try {
          policy.grantCapability(name, cap as any);
        } catch (err) {
          debug('Failed to grant capability %s to %s: %s', cap, name, err);
          throw err;
        }
      }
    }

    const updatedStatus = policy.getPluginSecurityStatus(name);

    return res.json({
      success: true,
      data: { status: updatedStatus },
      message: `Plugin '${name}' trust settings updated successfully`,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error updating trust for plugin %s:', req.params.name, hivemindError);
    return res.status(500).json({
      error: 'Failed to update plugin trust',
      message: hivemindError.message || 'An error occurred while updating plugin trust',
    });
  }
});

export default router;
