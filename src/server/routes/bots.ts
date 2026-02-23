import { Router } from 'express';
import { BotConfigurationManager } from '../../config/BotConfigurationManager';
import { ErrorUtils } from '../../types/errors';

const router = Router();
const manager = BotConfigurationManager.getInstance();

// POST /api/bots - Create a new bot
router.post('/', async (req, res) => {
  try {
    const botData = req.body;
    await manager.addBot(botData);
    const newBot = manager.getBot(botData.name);
    return res.status(201).json({ success: true, message: 'Bot created', bot: newBot });
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(400).json({ error: hivemindError.message });
  }
});

// PUT /api/bots/:id - Update a bot
router.put('/:id', async (req, res) => {
  try {
    const botId = req.params.id;
    const updates = req.body;

    // In the current implementation, ID is the name.
    // If the update includes a name change, this might be tricky, but assuming name change is not supported via this endpoint for now
    // or requires a different flow.

    await manager.updateBot(botId, updates);
    const updatedBot = manager.getBot(updates.name || botId);

    return res.json({ success: true, message: 'Bot updated', bot: updatedBot });
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    // 404 if not found, 400 otherwise
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: hivemindError.message });
  }
});

// DELETE /api/bots/:id - Delete a bot
router.delete('/:id', async (req, res) => {
  try {
    const botId = req.params.id;
    await manager.deleteBot(botId);
    return res.json({ success: true, message: 'Bot deleted' });
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: hivemindError.message });
  }
});

// POST /api/bots/:id/clone - Clone a bot
router.post('/:id/clone', async (req, res) => {
  try {
    const botId = req.params.id;
    const { newName } = req.body;

    if (!newName) {
      return res.status(400).json({ error: 'newName is required' });
    }

    const newBot = await manager.cloneBot(botId, newName);
    return res.status(201).json({ success: true, message: 'Bot cloned', bot: newBot });
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: hivemindError.message });
  }
});

export default router;
