import { EventEmitter } from 'events';
import { GreetingStateManager } from './GreetingStateManager';
import messageConfig from '@config/messageConfig';
import Logger from '@common/logger';
import { Message } from '@src/types/messages';
import { IMessengerService } from '@message/interfaces/IMessengerService';

const appLogger = Logger.withContext('StartupGreetingService');

class StartupGreetingService extends EventEmitter {
    private static instance: StartupGreetingService;
    private greetingStateManager: GreetingStateManager;

    private constructor() {
        super();
        console.log('!!! StartupGreetingService CONSTRUCTOR CALLED !!!');
        console.log('!!! StartupGreetingService EMITTER INSTANCE:', this);
        this.greetingStateManager = GreetingStateManager.getInstance();
        console.log('!!! REGISTERING service-ready LISTENER ON StartupGreetingService INSTANCE !!!');
        this.on('service-ready', this.handleServiceReady.bind(this));
    }

    public static getInstance(): StartupGreetingService {
        if (!StartupGreetingService.instance) {
            StartupGreetingService.instance = new StartupGreetingService();
        }
        return StartupGreetingService.instance;
    }

    public async initialize() {
        await this.greetingStateManager.initialize();
        appLogger.info('StartupGreetingService initialized');
    }

    private async handleServiceReady(service: IMessengerService) {
        try {
            // Get service name from constructor name or use a fallback
            const serviceName = service.constructor.name || 'UnknownService';
            console.log('!!! service-ready EVENT RECEIVED FOR:', serviceName);
            const greetingConfig = messageConfig.get('greeting') as { disabled: boolean; message: string };
            if (greetingConfig.disabled) {
                appLogger.info('Greeting message is disabled by configuration.');
                return;
            }

            const defaultChannel = service.getDefaultChannel();
            if (!defaultChannel) {
                appLogger.warn('No default channel configured for greeting message', { provider: serviceName });
                return;
            }

            const serviceId = `${serviceName}-${defaultChannel}`;
            if (this.greetingStateManager.hasGreetingBeenSent(serviceId)) {
                appLogger.info('Greeting already sent for this service and channel', { serviceId });
                return;
            }

            // Use sendMessageToChannel instead of sendMessage
            await service.sendMessageToChannel(defaultChannel, greetingConfig.message);
            await this.greetingStateManager.markGreetingAsSent(serviceId, defaultChannel);
            appLogger.info('Greeting message sent successfully', { provider: serviceName, channel: defaultChannel });
        } catch (error) {
            const serviceName = service.constructor.name || 'UnknownService';
            const defaultChannel = service.getDefaultChannel() || 'unknown';
            console.error('!!! ERROR IN handleServiceReady !!!', error);
            appLogger.error('Failed to send greeting message', { provider: serviceName, channel: defaultChannel, error });
        }
    }
}

export default StartupGreetingService.getInstance();