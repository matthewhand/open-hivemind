/**
 * Bot discovery logic — scanning environment variables and config files
 * to find bot names. Extracted from BotConfigurationManager.
 */

import Debug from 'debug';
import * as path from 'path';
import * as fs from 'fs';
import { botSchema } from './botSchema';

const debug = Debug('app:BotConfigurationManager');

/**
 * Auto-discover bot names by scanning config/bots directory
 */
export function discoverBotNamesFromFiles(): string[] {
  const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
  const botsDir = path.join(configDir, 'bots');

  if (!fs.existsSync(botsDir)) {
    return [];
  }

  try {
    const files = fs.readdirSync(botsDir);
    return files.filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
  } catch (e) {
    debug(`Error reading bots directory: ${e}`);
    return [];
  }
}

/**
 * Auto-discover bot names by scanning environment variables for BOTS_<NAME>_ prefix
 */
export function discoverBotNamesFromEnv(): string[] {
  const envVars = Object.keys(process.env);
  const botNames = new Set<string>();
  const schemaKeys = Object.keys(botSchema)
    .map((k) => String(k || '').toUpperCase())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const prefix = 'BOTS_';
  for (const rawKey of envVars) {
    const key = String(rawKey || '');
    const upper = key.toUpperCase();
    if (!upper.startsWith(prefix)) { continue; }

    for (const schemaKey of schemaKeys) {
      const suffix = `_${schemaKey}`;
      if (!upper.endsWith(suffix)) { continue; }
      const namePart = upper.slice(prefix.length, upper.length - suffix.length);
      if (!namePart) { break; }
      botNames.add(namePart.toLowerCase().replace(/_+/g, '-'));
      break;
    }
  }

  if (botNames.size > 0) {
    debug(`Auto-discovered potential bots from env: ${Array.from(botNames).join(', ')}`);
  }
  return Array.from(botNames);
}
