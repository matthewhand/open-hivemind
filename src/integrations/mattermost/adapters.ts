/**
 * Adapter implementations for MattermostService dependency injection.
 *
 * @deprecated This file is part of the legacy shim layer for Mattermost integration.
 * Import from '@hivemind/adapter-mattermost' instead. This shim will be removed in a future version.
 *
 * This file provides adapter classes that bridge the main codebase implementations
 * with the interfaces defined in @hivemind/shared-types, breaking the circular dependency.
 *
 * Migration example:
 * // Before
 * import { createMattermostDependencies } from '@src/integrations/mattermost/adapters';
 *
 * // After
 * // Dependency injection is now handled internally in the adapter package
 * import { MattermostService } from '@hivemind/adapter-mattermost';
 *
 * @see packages/adapter-mattermost/src/ for the new implementation
 *
 * @module
 */

import { BotConfigurationManager } from '@src/config/BotConfigurationManager';
import { MetricsCollector } from '@src/monitoring/MetricsCollector';
import StartupGreetingService from '@src/services/StartupGreetingService';
import messageConfig from '@config/messageConfig';
import { computeScore as channelComputeScore } from '@src/message/routing/ChannelRouter';
import { ErrorUtils } from '@src/types/errors';
import {
    type IBotConfigProvider,
    type IMetricsCollector,
    type IStartupGreetingEmitter,
    type IChannelScorer,
    type IErrorFactory,
    type MattermostBotConfig,
    type IMessengerService,
    ValidationError,
    NetworkError,
    AdapterError,
} from '@hivemind/shared-types';

/**
 * Adapter for BotConfigurationManager.
 * Provides bot configurations to the MattermostService.
 */
export class BotConfigProviderAdapter implements IBotConfigProvider {
    private configManager = BotConfigurationManager.getInstance();

    getAllBots(): MattermostBotConfig[] {
        return this.configManager.getAllBots() as MattermostBotConfig[];
    }
}

/**
 * Adapter for MetricsCollector.
 * Records operational metrics for the MattermostService.
 */
export class MetricsCollectorAdapter implements IMetricsCollector {
    private metrics = MetricsCollector.getInstance();

    incrementMessages(): void {
        this.metrics.incrementMessages();
    }

    incrementErrors(): void {
        this.metrics.incrementErrors();
    }

    recordResponseTime(time: number): void {
        this.metrics.recordResponseTime(time);
    }

    recordMessageFlow(event: import('@hivemind/shared-types').MessageFlowEventData): void {
        // Import WebSocketService lazily to avoid circular dependency at module load time
        // This is safe because recordMessageFlow is only called at runtime
        const WebSocketService = require('../../server/services/WebSocketService').default;
        WebSocketService.getInstance().recordMessageFlow(event);
    }
}

/**
 * Adapter for StartupGreetingService.
 * Emits service-ready events when MattermostService initializes.
 */
export class StartupGreetingEmitterAdapter implements IStartupGreetingEmitter {
    private greetingService = StartupGreetingService;

    emitServiceReady(service: IMessengerService): void {
        this.greetingService.emit('service-ready', service);
    }
}

/**
 * Adapter for ChannelRouter.
 * Provides channel scoring for prioritization.
 */
export class ChannelScorerAdapter implements IChannelScorer {
    isRouterEnabled(): boolean {
        try {
            return Boolean((messageConfig as any).get('MESSAGE_CHANNEL_ROUTER_ENABLED'));
        } catch {
            return false;
        }
    }

    computeScore(channelId: string): number {
        try {
            return channelComputeScore(channelId);
        } catch {
            return 0;
        }
    }
}

/**
 * Adapter for error factory.
 * Creates errors using the main codebase error utilities.
 */
export class ErrorFactoryAdapter implements IErrorFactory {
    createValidationError(message: string, field?: string, value?: unknown): ValidationError {
        return new ValidationError(message, field, value);
    }

    createNetworkError(message: string, statusCode?: number): NetworkError {
        return new NetworkError(message, statusCode);
    }

    toAdapterError(error: unknown): AdapterError {
        if (error instanceof AdapterError) {
            return error;
        }

        const hivemindError = ErrorUtils.toHivemindError(error);
        const message = ErrorUtils.getMessage(hivemindError);
        const statusCode = ErrorUtils.getStatusCode(hivemindError);

        return new AdapterError(message, 'unknown', 'UNKNOWN_ERROR', statusCode);
    }
}

/**
 * Create a complete dependencies object for MattermostService.
 */
export function createMattermostDependencies() {
    return {
        botConfigProvider: new BotConfigProviderAdapter(),
        metricsCollector: new MetricsCollectorAdapter(),
        greetingEmitter: new StartupGreetingEmitterAdapter(),
        channelScorer: new ChannelScorerAdapter(),
        errorFactory: new ErrorFactoryAdapter(),
    };
}
