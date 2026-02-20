/**
 * IBotManager Interface
 * 
 * Abstraction for the BotManager singleton.
 * This interface allows for easier testing and decoupling from the concrete implementation.
 */

import { BotInstance } from '../../managers/BotManager';

export interface IBotManager {
  /**
   * Gets all configured bots
   * @returns Array of bot instances
   */
  getAllBots(): Promise<BotInstance[]>;

  /**
   * Gets a specific bot by ID
   * @param botId - The bot ID
   * @returns Bot instance or null
   */
  getBot(botId: string): Promise<BotInstance | null>;

  /**
   * Starts a bot by ID
   * @param botId - The bot ID
   */
  startBotById(botId: string): Promise<void>;

  /**
   * Stops a bot by ID
   * @param botId - The bot ID
   */
  stopBotById(botId: string): Promise<void>;

  /**
   * Starts all configured bots
   */
  startAllConfiguredBots(): Promise<void>;

  /**
   * Stops all running bots
   */
  stopAllBots(): Promise<void>;

  /**
   * Checks if a bot is running
   * @param botId - The bot ID
   * @returns true if running
   */
  isBotRunning(botId: string): boolean;

  /**
   * Gets the count of running bots
   * @returns Number of running bots
   */
  getRunningBotCount(): number;
}
