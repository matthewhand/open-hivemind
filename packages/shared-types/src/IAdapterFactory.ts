import type { IMessengerService } from './IMessengerService';
import type { IServiceDependencies, IBotConfig } from './IServiceDependencies';

/**
 * Configuration for creating an adapter instance.
 */
export interface IAdapterConfig {
    botName: string;
    botConfig: IBotConfig;
}

/**
 * Factory function type for creating messenger service instances.
 * This is the primary way the main application creates adapter instances.
 */
export type IAdapterFactory = (
    config: IAdapterConfig,
    dependencies: IServiceDependencies
) => IMessengerService;

/**
 * Adapter module interface.
 * Each adapter package should export an object conforming to this interface.
 */
export interface IAdapterModule {
    /** Factory function to create service instances */
    createService: IAdapterFactory;
    /** Optional: Service class for direct instantiation (legacy support) */
    ServiceClass?: new (deps: IServiceDependencies) => IMessengerService;
    /** Optional: Adapter metadata */
    metadata?: {
        name: string;
        version?: string;
        platform: 'discord' | 'slack' | 'mattermost';
    };
}
