import type { IMessengerService } from './IMessengerService';
import type { IServiceDependencies } from './IServiceDependencies';
import type { IBotConfig } from './IBotConfig';

/**
 * Configuration for creating an adapter instance.
 */
export interface IAdapterConfig {
    botName: string;
    botConfig: IBotConfig;
}

/**
 * Factory function type for creating messenger service instances.
 */
export type IAdapterFactory = (
    config: IAdapterConfig,
    dependencies: IServiceDependencies
) => IMessengerService;
