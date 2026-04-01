import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { type SecureConfigManager } from '@config/SecureConfigManager';
import { ErrorUtils } from '../types/errors';
import type { BotInstance } from './botTypes';
import { isValidBotInstance } from './botValidation';

const debug = Debug('app:BotManager:persistence');

/**
 * Load custom bots from file into the provided map.
 */
export async function loadCustomBots(
  botsFilePath: string,
  customBots: Map<string, BotInstance>
): Promise<void> {
  try {
    try {
      await fs.promises.access(botsFilePath);
      const data = await fs.promises.readFile(botsFilePath, 'utf8');
      const bots = JSON.parse(data);
      customBots.clear();
      Object.entries(bots).forEach(([id, bot]: [string, unknown]) => {
        // Type guard to ensure the unknown value matches BotInstance interface
        if (isValidBotInstance(bot)) {
          customBots.set(id, bot);
        } else {
          debug(`Invalid bot instance found for ID ${id}, skipping`);
        }
      });
      debug(`Loaded ${customBots.size} custom bots`);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
      // File doesn't exist yet, that's ok
    }
  } catch (error: unknown) {
    debug('Error loading custom bots:', ErrorUtils.getMessage(error));
  }
}

/**
 * Save custom bots to file.
 */
export async function saveCustomBots(
  botsFilePath: string,
  customBots: Map<string, BotInstance>
): Promise<void> {
  try {
    const botsDir = path.dirname(botsFilePath);
    try {
      await fs.promises.access(botsDir);
    } catch {
      await fs.promises.mkdir(botsDir, { recursive: true });
    }

    const bots = Object.fromEntries(customBots);
    await fs.promises.writeFile(botsFilePath, JSON.stringify(bots, null, 2));
    debug(`Saved ${customBots.size} custom bots`);
  } catch (error: unknown) {
    debug('Error saving custom bots:', ErrorUtils.getMessage(error));
    throw ErrorUtils.createError('Failed to save custom bots', 'configuration');
  }
}

/**
 * Store sensitive configuration securely.
 */
export async function storeSecureConfig(
  secureConfigManager: SecureConfigManager,
  botId: string,
  config: Record<string, unknown>
): Promise<void> {
  const secureConfigId = `bot_${botId}`;
  const secureData = {
    ...config,
    storedAt: new Date().toISOString(),
  };

  await secureConfigManager.storeConfig({
    id: secureConfigId,
    name: `Bot ${botId} Configuration`,
    type: 'bot',
    data: secureData,
    createdAt: new Date().toISOString(),
  } as Parameters<typeof secureConfigManager.storeConfig>[0]);
}
