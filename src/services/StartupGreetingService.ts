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
            console.log('!!! service-ready EVENT RECEIVED FOR:', service.providerName);
            const greetingConfig = messageConfig.get('greeting') as { disabled: boolean; message: string };
            if (greetingConfig.disabled) {
                appLogger.info('Greeting message is disabled by configuration.');
                return;
            }

            const defaultChannel = service.getDefaultChannel();
            if (!defaultChannel) {
                appLogger.warn('No default channel configured for greeting message', { provider: service.providerName });
                return;
            }

            const serviceId = `${service.providerName}-${defaultChannel}`;
            if (this.greetingStateManager.hasGreetingBeenSent(serviceId)) {
                appLogger.info('Greeting already sent for this service and channel', { serviceId });
                return;
            }

            const greetingMessage: Message = {
                id: `greeting-${Date.now()}`,
                content: greetingConfig.message,
                channelId: defaultChannel,
                role: 'assistant',
                platform: service.providerName as any,
                data: {},
                createdAt: new Date()
            };
            await service.sendMessage(greetingMessage);
            await this.greetingStateManager.markGreetingAsSent(serviceId, defaultChannel);
            appLogger.info('Greeting message sent successfully', { provider: service.providerName, channel: defaultChannel });
        } catch (error) {
            console.error('!!! ERROR IN handleServiceReady !!!', error);
            appLogger.error('Failed to send greeting message', { provider: service.providerName, channel: defaultChannel, error });
        }
    }
}

export default StartupGreetingService.getInstance();