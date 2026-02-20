/**
 * IConfigurationManager Interface
 * 
 * Abstraction for the ConfigurationManager singleton.
 * This interface allows for easier testing and decoupling from the concrete implementation.
 */

import convict from 'convict';

export interface IConfigurationManager {
  /**
   * Retrieves a configuration object by name
   * @param configName - Name of the configuration to retrieve
   * @returns Requested configuration or null if not found
   */
  getConfig(configName: string): convict.Config<any> | null;

  /**
   * Stores a unique session ID for an integration/channel combination
   * @param integration - Integration name (e.g., 'slack', 'discord')
   * @param channelId - Channel/conversation identifier
   * @param sessionId - Session identifier to store
   */
  setSession(integration: string, channelId: string, sessionId: string): void;

  /**
   * Retrieves a stored session ID
   * @param integration - Integration name
   * @param channelId - Channel/conversation identifier
   * @returns Session ID if exists, undefined otherwise
   */
  getSession(integration: string, channelId: string): string | undefined;

  /**
   * Retrieves all sessions for an integration
   * @param integration - Integration name
   * @returns All channel-session mappings or undefined
   */
  getAllSessions(integration: string): Record<string, string> | undefined;
}
