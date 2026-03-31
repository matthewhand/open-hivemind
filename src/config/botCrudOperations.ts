/**
 * Bot CRUD file operations — add, update, delete, clone bots on disk.
 * Extracted from BotConfigurationManager for modularity.
 */

import Debug from 'debug';
import * as path from 'path';
import * as fs from 'fs';
import { discoverBotNamesFromEnv } from './botDiscovery';
import { TTLCache } from '../utils/TTLCache';

import type { BotConfig } from '@src/types/config';

const debug = Debug('app:BotConfigurationManager');

/**
 * Add a new bot configuration to disk.
 */
export async function addBotToFile(
  config: BotConfig,
  configCache: TTLCache<string, Record<string, unknown>>,
): Promise<void> {
  const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
  const botsDir = path.join(configDir, 'bots');

  // Ensure unique name/ID
  const safeName = config.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const filePath = path.join(botsDir, `${safeName}.json`);

  try {
    await fs.promises.access(filePath);
    throw new Error(`Bot with defined filename ${safeName}.json already exists`);
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
  }

  try {
    await fs.promises.access(botsDir);
  } catch {
    await fs.promises.mkdir(botsDir, { recursive: true });
  }

  // Write config
  await fs.promises.writeFile(filePath, JSON.stringify(config, null, 2));
  configCache.invalidate(filePath);
}

/**
 * Update an existing bot configuration on disk.
 */
export async function updateBotOnFile(
  name: string,
  updates: Record<string, unknown>,
  configCache: TTLCache<string, Record<string, unknown>>,
): Promise<void> {
  const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
  const botsDir = path.join(configDir, 'bots');
  const safeName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const filePath = path.join(botsDir, `${safeName}.json`);

  // For env-var configured bots, we store overrides in a JSON file
  // These overrides take precedence over env vars
  let currentConfig: Record<string, unknown> = {};

  try {
    const cached = configCache.get(filePath);
    if (cached) {
      currentConfig = cached;
    } else {
      const data = await fs.promises.readFile(filePath, 'utf8');
      currentConfig = JSON.parse(data);
      configCache.set(filePath, currentConfig);
    }
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      debug(`Failed to read existing bot config ${filePath}: ${e}`);
    }
  }

  // Merge updates
  const mergedConfig = {
    ...currentConfig,
    ...updates,
    name, // Ensure name is preserved
    _updatedAt: new Date().toISOString(),
  };

  try {
    await fs.promises.access(botsDir);
  } catch {
    await fs.promises.mkdir(botsDir, { recursive: true });
  }

  await fs.promises.writeFile(filePath, JSON.stringify(mergedConfig, null, 2));
  configCache.invalidate(filePath);
  debug(`Updated bot config for ${name} at ${filePath}`);
}

/**
 * Delete a bot configuration from disk.
 */
export async function deleteBotFromFile(name: string): Promise<void> {
  const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
  const botsDir = path.join(configDir, 'bots');
  const safeName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const filePath = path.join(botsDir, `${safeName}.json`);

  try {
    await fs.promises.access(filePath);
    await fs.promises.unlink(filePath);
    debug(`Deleted bot config for ${name} at ${filePath}`);
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      // Check if it's an environment variable bot
      const envBotNames = discoverBotNamesFromEnv();
      const canonical = (n: string): string => String(n || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
      const canonicalName = canonical(name);

      const foundInEnv = envBotNames.some((n) => canonical(n) === canonicalName);

      if (foundInEnv) {
        throw new Error(
          `Cannot delete bot "${name}" defined by environment variables. Please remove the environment variables starting with BOTS_${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_...`
        );
      } else {
        throw new Error(`Bot "${name}" not found`);
      }
    } else {
      throw e;
    }
  }
}
