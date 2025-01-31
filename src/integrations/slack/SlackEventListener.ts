import express from 'express';
import { SlackService } from './SlackService';

const router = express.Router();
export let slackService = new SlackService(); // Export it for mocking

router.post('/slack/events', async (req, res) => {
  const { event } = req.body;

  if (event && event.type === 'message' && !event.bot_id) {
    await slackService.sendMessage(event.channel, `You said: ${event.text}`);
  }

  res.sendStatus(200);
});

export default router;
