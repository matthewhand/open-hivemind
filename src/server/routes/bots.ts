import { Router } from 'express';
import { BotConfigurationManager } from '../../config/BotConfigurationManager';
import { BotConfig } from '../../types/config';

const router = Router();
const manager = BotConfigurationManager.getInstance();

// POST /api/bots - Create a new bot
router.post('/', async (req, res) => {
  try {
    const config = req.body as BotConfig;
    if (!config.name) {
      return res.status(400).json({ error: 'Bot name is required' });
    }
    await manager.addBot(config);
    return res.status(201).json({ success: true, message: 'Bot created', bot: manager.getBot(config.name) });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// PUT /api/bots/:id - Update a bot
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    await manager.updateBot(id, updates);
    return res.json({ success: true, message: 'Bot updated', bot: manager.getBot(id) });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: error.message });
  }
});

// DELETE /api/bots/:id - Delete a bot
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await manager.deleteBot(id);
    return res.json({ success: true, message: 'Bot deleted' });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: error.message });
  }
});

// POST /api/bots/:id/clone - Clone a bot
router.post('/:id/clone', async (req, res) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;
    if (!newName) {
      return res.status(400).json({ error: 'New bot name is required' });
    }
    const newBot = await manager.cloneBot(id, newName);
    return res.status(201).json({ success: true, message: 'Bot cloned', bot: newBot });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: error.message });
  }
});

export default router;
