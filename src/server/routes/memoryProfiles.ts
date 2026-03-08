import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, requireAdmin } from '../../auth/middleware';
import { MemoryManager } from '../../memory/MemoryManager';
import { webUIStorage } from '../../storage/webUIStorage';

const router = express.Router();

router.use(authenticate, requireAdmin);

/**
 * GET /api/admin/memory-profiles
 * Get all memory profiles
 */
router.get('/', (req, res) => {
  const profiles = webUIStorage.getMemoryProfiles();
  res.json({ success: true, data: profiles });
});

/**
 * POST /api/admin/memory-profiles
 * Create a new memory profile
 */
router.post(
  '/',
  [body('name').isString().notEmpty(), body('provider').isString().notEmpty()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, provider, apiKey, endpoint, apiUrl, namespace, scope, config } = req.body;
    const { v4: uuidv4 } = require('uuid');

    const profile = {
      id: `memory_${Date.now()}_${uuidv4().substring(0, 8)}`,
      name,
      provider,
      apiKey,
      endpoint,
      apiUrl,
      namespace,
      scope,
      config: config || {},
    };

    webUIStorage.saveMemoryProfile(profile);

    res.json({ success: true, data: profile });
  }
);

/**
 * PUT /api/admin/memory-profiles/:id
 * Update an existing memory profile
 */
router.put(
  '/:id',
  [body('name').optional().isString(), body('provider').optional().isString()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const profiles = webUIStorage.getMemoryProfiles();
    const existingIndex = profiles.findIndex((p: any) => p.id === id);

    if (existingIndex === -1) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const updatedProfile = {
      ...profiles[existingIndex],
      ...req.body,
      id, // Prevent changing ID
    };

    webUIStorage.saveMemoryProfile(updatedProfile);

    // Clear the memory cache so the provider is re-initialized with the new config
    MemoryManager.getInstance().clearCache(id);

    res.json({ success: true, data: updatedProfile });
  }
);

/**
 * DELETE /api/admin/memory-profiles/:id
 * Delete a memory profile
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  webUIStorage.deleteMemoryProfile(id);
  MemoryManager.getInstance().clearCache(id);
  res.json({ success: true });
});

/**
 * POST /api/admin/memory-profiles/test
 * Test the memory profile connection credentials
 */
router.post('/test', async (req, res): Promise<void> => {
  const { provider, apiKey, endpoint, apiUrl, token } = req.body;

  if (!provider) {
    res.status(400).json({ success: false, message: 'Provider is required for testing' });
    return;
  }

  try {
    const testConfig = {
      apiKey: apiKey || token,
      endpoint: endpoint || apiUrl,
      token: token || apiKey,
    };

    // Generate an ephemeral UUID so it doesn't collide with existing profiles in cache
    const { v4: uuidv4 } = require('uuid');
    const dummyId = `test_profile_${uuidv4()}`;

    // Inject it into a temporary object that the MemoryManager can use if we needed to,
    // but the cleanest way is to just instantiate the provider directly for the test.

    let result = false;
    let message = 'Connection test failed';

    if (provider === 'mem0') {
      const { Mem0Provider } = require('../../memory/providers/Mem0Provider');
      const mem0 = new Mem0Provider(testConfig);
      // Attempt a lightweight search query to validate auth
      await mem0.searchMemory('test_user', 'ping');
      result = true;
      message = 'Connected to Mem0 successfully';
    } else if (provider === 'mem4ai') {
      const { Mem4aiProvider } = require('../../memory/providers/Mem4aiProvider');
      const mem4ai = new Mem4aiProvider(testConfig);
      await mem4ai.searchMemory('test_user', 'ping');
      result = true;
      message = 'Connected to mem4ai successfully';
    } else if (provider === 'memvault') {
      const { MemVaultProvider } = require('../../memory/providers/MemVaultProvider');
      const memvault = new MemVaultProvider(testConfig);
      await memvault.searchMemory('test_user', 'ping');
      result = true;
      message = 'Connected to MemVault safely';
    } else {
      res.status(400).json({ success: false, message: 'Unknown provider type' });
      return;
    }

    res.json({ success: result, message });
    return; // Added return to clear implicit code path lint
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Connection test threw an error',
      error: error.toString(),
    });
  }
});

export default router;
