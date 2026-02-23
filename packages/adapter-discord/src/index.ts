/**
 * @hivemind/adapter-discord
 *
 * Discord adapter for Open Hivemind.
 * This package provides Discord integration through the IMessengerService interface.
 */

import type {
    IAdapterFactory,
    IAdapterConfig,
    IServiceDependencies,
    IMessengerService,
} from '@hivemind/shared-types';
import { DiscordService, Discord } from './DiscordService';
export { DiscordService, Discord };
export { default as DiscordMessage } from './DiscordMessage';
export { testDiscordConnection } from './DiscordConnectionTest';
export { DiscordMessageProvider } from './providers/DiscordMessageProvider';
export type { Bot } from './managers/DiscordBotManager';

/**
 * Factory function to create a Discord service instance.
 * This is the recommended way to create DiscordService instances.
 */
export const createDiscordService: IAdapterFactory = (
    config: IAdapterConfig,
    dependencies: IServiceDependencies
): IMessengerService => {
    const service = new DiscordService(dependencies);
    // Store the bot config for later use
    (service as any)._botConfig = config.botConfig;
    return service;
};

/**
 * Adapter module metadata
 */
export const adapterMetadata = {
    name: '@hivemind/adapter-discord',
    version: '1.0.0',
    platform: 'discord' as const,
};

/**
 * Default export: the factory function
 */
export default createDiscordService;
