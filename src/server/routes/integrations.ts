import { Router } from 'express';
import ProviderConfigManager from '@src/config/ProviderConfigManager';
import { authenticateToken, requireRole } from '@src/server/middleware/auth';
import Debug from 'debug';

const log = Debug('app:integrationsRouter');
const router = Router();
const providerManager = ProviderConfigManager.getInstance();

// Middleware: Admin access required for all integration changes
router.use(authenticateToken);
router.use(requireRole('admin'));

/**
 * GET /api/integrations
 * List all configured provider instances
 */
router.get('/', (req, res) => {
  try {
    const providers = providerManager.getAllProviders();
    // Mask sensitive data? Token/API Key?
    // Frontend needs them to edit? Or we mask them like '****'?
    // Typically editing requires seeing or overwriting. 
    // For security, masking is better, but for MVP editing, we send full config?
    // Current assumption: Admin is trusted.
    
    // Optional: category filter
    const category = req.query.category as 'message' | 'llm' | undefined;
    const filtered = category ? providerManager.getAllProviders(category) : providers;

    res.json(filtered);
  } catch (err: any) {
    log('Error fetching integrations:', err);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

/**
 * GET /api/integrations/:id
 * Get single provider instance
 */
router.get('/:id', (req, res) => {
    const provider = providerManager.getProvider(req.params.id);
    if (!provider) {
        return res.status(404).json({ error: 'Provider not found' });
    }
    res.json(provider);
});

/**
 * POST /api/integrations
 * Create new provider instance
 */
router.post('/', (req, res) => {
  try {
    const { type, category, name, config, enabled } = req.body;
    
    if (!type || !name || !category) {
        return res.status(400).json({ error: 'Missing required fields: type, category, name' });
    }

    const newInstance = providerManager.createProvider({
        type,
        category,
        name,
        config: config || {},
        enabled: enabled !== false // Default true
    });

    log(`Created new ${category} provider: ${name} (${type})`);
    res.status(201).json(newInstance);
  } catch (err: any) {
    log('Error creating integration:', err);
    res.status(500).json({ error: 'Failed to create integration' });
  }
});

/**
 * PUT /api/integrations/:id
 * Update provider instance
 */
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Prevent changing ID
        delete updates.id;

        const updated = providerManager.updateProvider(id, updates);
        if (!updated) {
            return res.status(404).json({ error: 'Provider not found' });
        }

        log(`Updated provider: ${updated.name}`);
        res.json(updated);
    } catch (err: any) {
        log('Error updating integration:', err);
        res.status(500).json({ error: 'Failed to update integration' });
    }
});

/**
 * DELETE /api/integrations/:id
 * Delete provider instance
 */
router.delete('/:id', (req, res) => {
    try {
        const success = providerManager.deleteProvider(req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'Provider not found' });
        }
        log(`Deleted provider: ${req.params.id}`);
        res.json({ success: true });
    } catch (err: any) {
        log('Error deleting integration:', err);
        res.status(500).json({ error: 'Failed to delete integration' });
    }
});

export default router;
