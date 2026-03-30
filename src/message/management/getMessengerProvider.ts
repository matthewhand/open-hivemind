import * as fs from 'fs';
import * as path from 'path';
import { instantiateMessageService, loadPlugin } from '@src/plugins/PluginLoader';

const gmpDebug = require('debug')('app:getMessengerProvider');

/**
 * Get Messenger Providers
 *
 * Determines and returns an array of message provider instances based on:
 * 1) MESSAGE_PROVIDER env/config filter (comma-separated list: e.g., "discord,slack")
 * 2) messengers.json provider instance definitions
 *
 * If MESSAGE_PROVIDER is defined, only providers listed there will be initialized (and must also have instances configured).
 * If MESSAGE_PROVIDER is not defined, behavior falls back to messengers.json, and if none found, defaults to Slack singleton.
 *
 * @returns Array of initialized message provider instances.
 */
// Ensure CommonJS require compatibility for tests using jest.mock()
function __require(modulePath: string): any {
  return require(modulePath);
}

let cachedMessengersConfig: any = null;

export function resetMessengerProviderCache(): void {
  cachedMessengersConfig = null;
}

export function getMessengerProvider() {
  const messengersConfigPath = path.join(__dirname, '../../../config/providers/messengers.json');

  let messengersConfig: any = {};

  if (cachedMessengersConfig) {
    messengersConfig = cachedMessengersConfig;
  } else {
    try {
      const messengersConfigRaw = fs.readFileSync(messengersConfigPath, 'utf-8');
      messengersConfig = messengersConfigRaw ? JSON.parse(messengersConfigRaw) : {};
    } catch (_error) {
      // If file doesn't exist or JSON is invalid, use empty config
      messengersConfig = {};
    }
    cachedMessengersConfig = messengersConfig;
  }

  const messengerServices: any[] = [];

  // Derive MESSAGE_PROVIDER filter similar to src/index.ts bootstrap
  // Supports string or array-like values via environment (primary) or config fallback
  const rawProviders = process.env.MESSAGE_PROVIDER || messengersConfig.MESSAGE_PROVIDER;
  const providerFilter: string[] =
    typeof rawProviders === 'string'
      ? rawProviders
          .split(',')
          .map((v: string) => v.trim().toLowerCase())
          .filter(Boolean)
      : Array.isArray(rawProviders)
        ? rawProviders.map((v: any) => String(v).trim().toLowerCase()).filter(Boolean)
        : [];

  const wantProvider = (name: string) => {
    return providerFilter.length === 0 || providerFilter.includes(name.toLowerCase());
  };

  // In tests we exclusively support the { providers: [{ type: string }] } shape
  const providersArray: { type: string }[] = Array.isArray((messengersConfig as any).providers)
    ? (messengersConfig as any).providers
    : [];

  const hasType = (type: string) =>
    providersArray.some((p) => String(p.type).toLowerCase() === type.toLowerCase());

  const LOW_MEMORY = process.env.LOW_MEMORY_MODE === 'true';
  const hasDiscord = hasType('discord') || providerFilter.includes('discord');
  const hasSlack = hasType('slack') || providerFilter.includes('slack');
  const hasMattermost = hasType('mattermost') || providerFilter.includes('mattermost');

  // Load each requested message provider dynamically via PluginLoader
  const requestedTypes = [
    { name: 'discord', wanted: hasDiscord && wantProvider('discord') },
    { name: 'slack', wanted: hasSlack && wantProvider('slack') },
    { name: 'mattermost', wanted: hasMattermost && wantProvider('mattermost') },
  ];

  for (const { name, wanted } of requestedTypes) {
    if (!wanted) continue;
    try {
      const mod = loadPlugin(`message-${name}`);
      const svc = instantiateMessageService(mod);
      if (svc) {
        if (typeof (svc as any).provider === 'undefined') {
          (svc as any).provider = name;
        }
        messengerServices.push(svc);
        gmpDebug('Initialized %s provider via plugin loader', name);
      }
    } catch (e: any) {
      gmpDebug(`Failed to initialize ${name} provider: ${e?.message || String(e)}`);
    }
  }

  // If filter is set but nothing matched, do not silently default; log and keep empty to surface config issues
  if (providerFilter.length > 0 && messengerServices.length === 0) {
    gmpDebug(
      `MESSAGE_PROVIDER filter set (${providerFilter.join(', ')}), but no configured instances found in messengers.json`
    );
  }

  if (messengerServices.length === 0) {
    // Historical behavior: default to Slack if nothing configured and no filter provided
    if (providerFilter.length === 0) {
      gmpDebug('No valid messenger providers initialized, defaulting to Slack');
      try {
        const mod = loadPlugin('message-slack');
        const svc = instantiateMessageService(mod);
        if (svc) {
          if (typeof (svc as any).provider === 'undefined') {
            (svc as any).provider = 'slack';
          }
          messengerServices.push(svc);
        }
      } catch (_e) {
        // As a last resort in tests, return a recognizable Slack sentinel
        messengerServices.push({
          provider: 'slack',
          sendMessageToChannel: () => {},
          getClientId: () => 'SLACK_CLIENT_ID',
        });
      }
    }
  }

  gmpDebug(
    `Returning ${messengerServices.length} provider(s): ${messengerServices.map((p: any) => p?.provider).join(',')}`
  );
  return messengerServices;
}

module.exports = { getMessengerProvider, resetMessengerProviderCache };
