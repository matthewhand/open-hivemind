import SlackService from './SlackService';
import type { PluginManifest } from '../../../src/plugins/PluginLoader';

// Core modules
export { SlackConfigurationLoader } from './core/SlackConfigurationLoader';
export { SlackInstanceFactory } from './core/SlackInstanceFactory';

// Routing modules
export { SlackRouteRegistry } from './routing/SlackRouteRegistry';

// Event handling modules
export { SlackMessageHandler } from './events/SlackMessageHandler';

// Utility modules
export { SlackChannelManager } from './utils/SlackChannelManager';

// Re-export existing classes for backward compatibility
export { default as SlackService } from './SlackService';
export { SlackBotManager } from './SlackBotManager';
export { SlackSignatureVerifier } from './SlackSignatureVerifier';
export { SlackInteractiveHandler } from './SlackInteractiveHandler';
export { SlackInteractiveActions } from './SlackInteractiveActions';
export { SlackEventProcessor } from './SlackEventProcessor';
export { SlackMessageProcessor } from './SlackMessageProcessor';
export { SlackWelcomeHandler } from './SlackWelcomeHandler';
export { default as SlackMessage } from './SlackMessage';

// New exports for migration
export { SlackMessageProvider } from './providers/SlackMessageProvider';
export { testSlackConnection } from './SlackConnectionTest';

/** Standard factory — preferred entry point for PluginLoader */
export function create(_config?: any): any {
  return SlackService.getInstance();
}

export const manifest: PluginManifest = {
  displayName: 'Slack',
  description: 'Connect your bots to Slack workspaces',
  type: 'message',
  minVersion: '1.0.0',
};
