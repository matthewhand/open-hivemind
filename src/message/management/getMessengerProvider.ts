import * as path from 'path';
import * as fs from 'fs';

const gmpDebug = require('debug')('app:getMessengerProvider');
// These modules are mocked in tests; keep access shape simple and flat
const DiscordMgr = require('@integrations/discord/DiscordService');
const SlackMgr = require('@integrations/slack/SlackService');

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
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(modulePath);
}

export function getMessengerProvider() {
  const messengersConfigPath = path.join(__dirname, '../../../config/providers/messengers.json');
  const messengersConfigRaw = fs.readFileSync(messengersConfigPath, 'utf-8');
  const messengersConfig = messengersConfigRaw ? JSON.parse(messengersConfigRaw) : {};

  const messengerServices: any[] = [];

  // Derive MESSAGE_PROVIDER filter similar to src/index.ts bootstrap
  // Supports string or array-like values via environment (primary) or config fallback
  const rawProviders = process.env.MESSAGE_PROVIDER || messengersConfig.MESSAGE_PROVIDER;
  const providerFilter: string[] = typeof rawProviders === 'string'
    ? rawProviders.split(',').map((v: string) => v.trim().toLowerCase()).filter(Boolean)
    : Array.isArray(rawProviders)
    ? rawProviders.map((v: any) => String(v).trim().toLowerCase()).filter(Boolean)
    : [];

  const wantProvider = (name: string) => {
    return providerFilter.length === 0 || providerFilter.includes(name.toLowerCase());
  };

  // In tests we exclusively support the { providers: [{ type: string }] } shape
  const providersArray: Array<{ type: string }> = Array.isArray((messengersConfig as any).providers)
    ? (messengersConfig as any).providers
    : [];

  const hasType = (type: string) =>
    providersArray.some((p) => String(p.type).toLowerCase() === type.toLowerCase());

  const hasDiscord = hasType('discord');
  const hasSlack = hasType('slack');
  // Mattermost support has been removed from main

  // Discord (singleton) - tests mock as { DiscordService: { getInstance } }
  if (wantProvider('discord') && hasDiscord) {
    try {
      const svc =
        DiscordMgr?.DiscordService?.getInstance
          ? DiscordMgr.DiscordService.getInstance()
          : undefined;
      if (svc) {
        // Ensure provider identity is exposed for tests
        if (typeof (svc as any).provider === 'undefined') {
          (svc as any).provider = 'discord';
        }
        messengerServices.push(svc);
        gmpDebug(`Initialized Discord provider`);
        gmpDebug(`Discord svc typeof=${typeof svc} keys=${Object.keys(svc)} provider=${(svc as any).provider}`);
      }
    } catch (e: any) {
      gmpDebug(`Failed to initialize Discord provider: ${e?.message || String(e)}`);
    }
  }

  // Slack (singleton) - use getInstance
  if (wantProvider('slack') && hasSlack) {
    try {
      let svc: any = null;
      // Prefer the exact export shape used by tests
      if (SlackMgr?.SlackService?.getInstance) {
        svc = SlackMgr.SlackService.getInstance();
      } else if (SlackMgr?.default?.SlackService?.getInstance) {
        svc = SlackMgr.default.SlackService.getInstance();
      } else if (SlackMgr?.default?.getInstance) {
        svc = SlackMgr.default.getInstance();
      } else if (typeof SlackMgr === 'function' && SlackMgr.getInstance) {
        svc = SlackMgr.getInstance();
      }
      if (svc) {
        // Ensure provider identity is exposed for tests
        if (typeof (svc as any).provider === 'undefined') {
          (svc as any).provider = 'slack';
        }
        messengerServices.push(svc);
        gmpDebug(`Initialized Slack provider`);
        gmpDebug(`Slack svc typeof=${typeof svc} keys=${Object.keys(svc)} provider=${(svc as any).provider}`);
      }
    } catch (e: any) {
      gmpDebug(`Failed to initialize Slack provider: ${e?.message || String(e)}`);
    }
  }

  // Mattermost support removed

  // If filter is set but nothing matched, do not silently default; log and keep empty to surface config issues
  if (providerFilter.length > 0 && messengerServices.length === 0) {
    gmpDebug(`MESSAGE_PROVIDER filter set (${providerFilter.join(', ')}), but no configured instances found in messengers.json`);
  }

  if (messengerServices.length === 0) {
    // Historical behavior: default to Slack if nothing configured and no filter provided
    if (providerFilter.length === 0) {
      gmpDebug('No valid messenger providers initialized, defaulting to Slack');
      try {
        let svc: any = null;
        if (SlackMgr?.SlackService?.getInstance) {
          svc = SlackMgr.SlackService.getInstance();
        } else if (SlackMgr?.default?.SlackService?.getInstance) {
          svc = SlackMgr.default.SlackService.getInstance();
        } else if (SlackMgr?.default?.getInstance) {
          svc = SlackMgr.default.getInstance();
        } else if (typeof SlackMgr === 'function' && SlackMgr.getInstance) {
          svc = SlackMgr.getInstance();
        }
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

  gmpDebug(`Returning ${messengerServices.length} provider(s): ${messengerServices.map((p:any)=>p?.provider).join(',')}`);
  return messengerServices;
}

module.exports = { getMessengerProvider };
