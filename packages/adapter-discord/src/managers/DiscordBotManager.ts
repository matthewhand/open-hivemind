import Debug from 'debug';
import { Client, GatewayIntentBits } from 'discord.js';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import ProviderConfigManager from '@config/ProviderConfigManager';
import { UserConfigStore } from '@config/UserConfigStore';
import { ValidationError } from '../../../../src/types/errorClasses';

const SafeGatewayIntentBits: any = (GatewayIntentBits as any) || {};
const log = Debug('app:discordBotManager');

export interface Bot {
  client: Client;
  botUserId: string;
  botUserName: string;
  config: any;
}

export class DiscordBotManager {
  private bots: Bot[] = [];

  private static readonly intents = [
    SafeGatewayIntentBits.Guilds ?? 1 << 0,
    SafeGatewayIntentBits.GuildMessages ?? 1 << 9,
    SafeGatewayIntentBits.MessageContent ?? 1 << 15,
    SafeGatewayIntentBits.GuildVoiceStates ?? 1 << 7,
  ];

  constructor() {
    this.loadBotsFromConfig();
  }

  private loadBotsFromConfig(): void {
    const configManager = BotConfigurationManager.getInstance();
    const providerManager = ProviderConfigManager.getInstance();
    const userConfigStore = UserConfigStore.getInstance();

    const botConfigs = configManager.getDiscordBotConfigs();
    const providers = providerManager
      .getAllProviders('message')
      .filter((p) => p.type === 'discord' && p.enabled);

    if (providers.length === 0) {
      // Fallback: Check for legacy DISCORD_BOT_TOKEN environment variable
      const legacyToken = process.env.DISCORD_BOT_TOKEN;
      if (legacyToken) {
        log(
          'Found DISCORD_BOT_TOKEN env var, using as single provider (splitting by comma if multiple)'
        );
        const tokens = legacyToken
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        tokens.forEach((token, index) => {
          const name = tokens.length > 1 ? `Discord Bot ${index + 1}` : 'Discord Bot';
          this.addBotToPool(token, name, {
            name,
            messageProvider: 'discord',
            discord: { token },
          });
        });
        return;
      }

      if (botConfigs.length === 0) {
        log('No Discord providers configured.');
        return; // No tokens, no bots.
      }
    }

    if (botConfigs.length > 0) {
      // Mode A: Logical Bots Defined (Match to Providers)
      botConfigs.forEach((botConfig) => {
        // Check if bot is disabled in user config
        if (userConfigStore.isBotDisabled(botConfig.name)) {
          log(`Bot ${botConfig.name} is disabled in user config, skipping initialization.`);
          return;
        }

        // Find matching provider by ID, or fallback to first/default
        let provider = providers.find((p) => p.id === botConfig.messageProviderId);
        if (!provider) {
          // Heuristic: If only 1 provider exists, use it.
          if (providers.length === 1) {
            provider = providers[0];
          }
        }

        if (provider && provider.config.token) {
          this.addBotToPool(provider.config.token, botConfig.name, botConfig);
        } else if (botConfig.discord?.token) {
          // Legacy/Manual Mode: Bot config has token directly
          this.addBotToPool(botConfig.discord.token, botConfig.name, botConfig);
        } else {
          log(`Bot ${botConfig.name} has no matching/valid Discord provider. Skipping.`);
        }
      });
    } else {
      // Mode B: No Logical Bots (Ad-Hoc / Legacy Mode / Test Mode)
      // Create one bot per Provider Instance
      providers.forEach((provider, index) => {
        if (provider.config.token) {
          const name = provider.name || `Discord Bot ${index + 1}`;

          // Check if bot is disabled in user config
          if (userConfigStore.isBotDisabled(name)) {
            log(`Bot ${name} is disabled in user config, skipping initialization.`);
            return;
          }

          // Create a dummy bot config
          const dummyConfig = {
            name,
            messageProvider: 'discord',
            // Default to first available LLM or flowise as fallback
            llmProvider: 'flowise',
            ...provider.config,
          };
          this.addBotToPool(provider.config.token, name, dummyConfig);
        }
      });
    }
  }

  private addBotToPool(token: string, name: string, config: any): void {
    const client = new Client({ intents: DiscordBotManager.intents });
    this.bots.push({
      client,
      botUserId: '',
      botUserName: name,
      config: {
        ...config,
        discord: { token, ...config.discord },
        token, // Ensure root token property exists for legacy checks
      },
    });
  }

  public async addBot(botConfig: any): Promise<void> {
    const token = botConfig?.discord?.token || botConfig?.token;
    const name = botConfig?.name || `Bot${this.bots.length + 1}`;
    if (!token) {
      throw new ValidationError('Discord addBot requires a token', 'DISCORD_ADDBOT_MISSING_TOKEN');
    }

    const client = new Client({ intents: DiscordBotManager.intents });
    const newBot: Bot = {
      client,
      botUserId: '',
      botUserName: name,
      config: {
        ...botConfig,
        name,
        token,
        discord: { ...botConfig?.discord, token },
        llmProvider: botConfig?.llmProvider || 'flowise',
        llm: botConfig?.llm || undefined,
      },
    };
    this.bots.push(newBot);

    // Caller is responsible for setting up listeners (event handler) and logging in
    // However, to keep addBot encapsulation, we might want to return the bot so caller can do that.
    // The original implementation had logic to attach listeners if handler was set.
    // We will handle that in the coordination layer (DiscordService) or DiscordEventHandler.
  }

  /**
   * Initializes all loaded bots (logs them in).
   */
  public async initializeBots(): Promise<void> {
    if (!this.bots || this.bots.length === 0) {
      log('DiscordBotManager.initializeBots(): no Discord bots configured. Skipping.');
      return;
    }

    // Validate tokens
    const invalidBots = this.bots
      .map((bot, index) => {
        const token = bot.config.token || bot.config.discord?.token;
        const trimmed = token ? token.trim() : '';
        return !trimmed
          ? { index, name: bot.botUserName || bot.config.name || `bot#${index + 1}` }
          : null;
      })
      .filter((b): b is { index: number; name: string } => !!b);

    if (invalidBots.length > 0) {
      log(
        `DiscordBotManager: found ${invalidBots.length} bot(s) with missing/empty tokens: ` +
          invalidBots.map((b) => b.name).join(', ')
      );
      throw new ValidationError(
        'Cannot initialize DiscordService: One or more bot tokens are empty',
        'DISCORD_EMPTY_TOKENS_INIT'
      );
    }

    log(`DiscordBotManager: starting login for ${this.bots.length} Discord bot(s).`);

    const loginPromises = this.bots.map((bot) => {
      return new Promise<void>(async (resolve) => {
        bot.client.once('ready', () => {
          const user = bot.client.user;
          log(
            `Discord bot ready: name=${bot.botUserName}, tag=${user?.tag}, id=${user?.id}, username=${user?.username}`
          );
          bot.botUserId = user?.id || '';
          try {
            if (!bot.config) {
              bot.config = {};
            }
            bot.config.BOT_ID = bot.botUserId;
            bot.config.discord = { ...(bot.config.discord || {}), clientId: bot.botUserId };
          } catch {}
          log(`Initialized ${bot.botUserName} OK`);
          resolve();
        });

        try {
          const token = (bot.config.token || bot.config.discord?.token || '').trim();
          log(`DiscordBotManager: initiating login for bot=${bot.botUserName}`);
          await bot.client.login(token);
          log(`DiscordBotManager: login call completed for bot=${bot.botUserName}`);
        } catch (err: any) {
          log(
            `DiscordBotManager: failed to login bot=${bot.botUserName}: ${err?.message || String(err)}`
          );
          resolve();
        }
      });
    });

    await Promise.all(loginPromises);
  }

  public getAllBots(): Bot[] {
    return this.bots;
  }

  public getClient(index = 0): Client {
    return this.bots[index]?.client || this.bots[0].client;
  }

  public getBotByName(name: string): Bot | undefined {
    return this.bots.find((bot) => bot.botUserName === name);
  }

  public async shutdown(): Promise<void> {
    for (const bot of this.bots) {
      await bot.client.destroy();
      log(`Bot ${bot.botUserName} shut down`);
    }
  }

  public async disconnectBot(botName: string): Promise<boolean> {
    const botIndex = this.bots.findIndex(
      (b) => b.botUserName === botName || b.config?.name === botName
    );

    if (botIndex === -1) {
      log(`disconnectBot: Bot "${botName}" not found`);
      return false;
    }

    const bot = this.bots[botIndex];
    try {
      await bot.client.destroy();
      log(`Disconnected bot: ${bot.botUserName}`);
      this.bots.splice(botIndex, 1);
      return true;
    } catch (error: any) {
      log(`Error disconnecting bot ${botName}: ${error?.message || error}`);
      return false;
    }
  }

  public isBotConnected(botName: string): boolean {
    const bot = this.bots.find((b) => b.botUserName === botName || b.config?.name === botName);
    if (!bot) return false;
    return bot.client.ws.status === 0;
  }

  public getHealthStatus(): Record<string, any> {
    const botStatus: Record<string, any> = {};
    for (const bot of this.bots) {
      const status = bot.client.ws.status;
      const uptime = bot.client.uptime ? bot.client.uptime / 1000 : 0;
      botStatus[bot.botUserName] = {
        connected: status === 0,
        status:
          ['READY', 'CONNECTING', 'RECONNECTING', 'IDLE', 'NEARLY', 'DISCONNECTED'][status] ||
          'UNKNOWN',
        uptime: uptime,
        ping: bot.client.ws.ping,
      };
    }
    return botStatus;
  }
}
