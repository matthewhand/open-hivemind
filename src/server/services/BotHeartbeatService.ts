import Debug from 'debug';
import { BotManager } from '../../managers/BotManager';
import { getMessengerService } from '../../managers/botLifecycle';
import Logger from '../../common/logger';

const debug = Debug('app:services:BotHeartbeatService');
const logger = Logger.withContext('BotHeartbeatService');

/**
 * BotHeartbeatService monitors the actual connectivity status of active bots.
 * If a bot is supposed to be running but the messenger connection (Discord/Slack) 
 * has dropped, it automatically triggers a restart (Auto-Healing).
 */
export class BotHeartbeatService {
  private static instance: BotHeartbeatService;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly intervalMs = parseInt(process.env.HEARTBEAT_INTERVAL_MS || '60000', 10);
  private isProcessing = false;

  private constructor() {}

  public static getInstance(): BotHeartbeatService {
    if (!BotHeartbeatService.instance) {
      BotHeartbeatService.instance = new BotHeartbeatService();
    }
    return BotHeartbeatService.instance;
  }

  /**
   * Start the heartbeat monitoring loop
   */
  public start(): void {
    if (this.checkInterval) return;

    logger.info('Starting Bot Heartbeat Service', { intervalMs: this.intervalMs });
    this.checkInterval = setInterval(() => this.checkBots(), this.intervalMs);
    
    // Initial check after a short delay
    setTimeout(() => this.checkBots(), 5000);
  }

  /**
   * Stop the heartbeat monitoring loop
   */
  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Bot Heartbeat Service stopped');
    }
  }

  /**
   * Perform a connectivity check for all active bots
   */
  private async checkBots(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const botManager = await BotManager.getInstance();
      const botsStatus = await botManager.getBotsStatus();
      
      const activeRunningBots = botsStatus.filter(b => b.isActive && b.isRunning);
      
      if (activeRunningBots.length === 0) {
        this.isProcessing = false;
        return;
      }

      debug(`Checking connectivity for ${activeRunningBots.length} active bots`);

      for (const botStatus of activeRunningBots) {
        try {
          const service = await getMessengerService(botStatus.provider);
          
          if (!service) continue;

          // Heuristic check
          const isActuallyConnected = await (service as any).isConnected(botStatus.name);

          if (!isActuallyConnected) {
            logger.warn(`Bot Auto-Healing triggered: ${botStatus.name} is active but disconnected`, { 
              botId: botStatus.id,
              provider: botStatus.provider 
            });

            // Trigger restart
            await botManager.restartBot(botStatus.id);
            
            logger.info(`Auto-healing restart completed for ${botStatus.name}`);
          }
        } catch (botErr) {
          debug(`Error checking heartbeat for ${botStatus.name}:`, botErr);
        }
      }
    } catch (error) {
      logger.error('Error during bot heartbeat check', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    } finally {
      this.isProcessing = false;
    }
  }
}
