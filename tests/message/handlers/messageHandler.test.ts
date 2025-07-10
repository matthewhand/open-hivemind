import { IMessage } from '@message/interfaces/IMessage';
import { processCommand } from '@message/helpers/handler/processCommand';
import { stripBotId } from '@message/helpers/processing/stripBotId';
import { addUserHintFn as addUserHint } from '@message/helpers/processing/addUserHint';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { shouldReplyToMessage } from '@message/helpers/processing/shouldReplyToMessage';
import MessageDelayScheduler from '@message/helpers/handler/MessageDelayScheduler';
import { sendFollowUpRequest } from '@message/helpers/handler/sendFollowUpRequest';
import messageConfig from '@config/messageConfig';
import { getMessengerProvider } from '@message/management/getMessengerProvider';

// 1. Mock all dependencies at the top. Jest hoists these.
jest.mock('@message/helpers/handler/processCommand');
jest.mock('@message/helpers/processing/stripBotId');
jest.mock('@message/helpers/processing/addUserHint');
jest.mock('@src/llm/getLlmProvider');
jest.mock('@message/helpers/processing/shouldReplyToMessage');
jest.mock('@message/helpers/handler/MessageDelayScheduler');
jest.mock('@message/helpers/handler/sendFollowUpRequest');
jest.mock('@config/messageConfig');
jest.mock('@message/management/getMessengerProvider');

// 2. Provide a default implementation for the mocks that are called at module-level.
// This runs before the messageHandler module is imported and its top-level code executes.
const mockLlmProvider = { generateChatCompletion: jest.fn() };
const mockMessengerProvider = { getClientId: jest.fn(), sendMessageToChannel: jest.fn() };
(getLlmProvider as jest.Mock).mockReturnValue([mockLlmProvider]);
(getMessengerProvider as jest.Mock).mockReturnValue([mockMessengerProvider]);

const mockScheduleMessage = jest.fn();
(MessageDelayScheduler.getInstance as jest.Mock).mockReturnValue({
    scheduleMessage: mockScheduleMessage,
});

// 3. NOW import the module to be tested.
import { handleMessage } from '@message/handlers/messageHandler';

// Typecast the mocked functions to control their behavior inside the tests
const mockedProcessCommand = processCommand as jest.Mock;
const mockedStripBotId = stripBotId as jest.Mock;
const mockedAddUserHint = addUserHint as jest.Mock;
const mockedShouldReplyToMessage = shouldReplyToMessage as jest.Mock;
const mockedSendFollowUpRequest = sendFollowUpRequest as jest.Mock;
const mockedMessageConfigGet = (messageConfig as any).get as jest.Mock;

const createMockMessage = (text: string): IMessage => ({
    getText: () => text,
    getChannelId: () => 'test-channel',
    getAuthorId: () => 'test-user',
    getMessageId: () => 'test-message-id',
    role: 'user',
    metadata: {},
} as any);

describe('handleMessage', () => {

    beforeEach(() => {
        // 4. Reset mocks to ensure test isolation.
        jest.clearAllMocks();

        // 5. Re-configure the mocks with specific return values for each test.
        mockLlmProvider.generateChatCompletion.mockResolvedValue('LLM response');
        mockMessengerProvider.getClientId.mockReturnValue('bot-id');
        mockMessengerProvider.sendMessageToChannel.mockResolvedValue('ts-12345');
        mockedStripBotId.mockImplementation(text => text);
        mockedAddUserHint.mockImplementation(text => text);
        mockedMessageConfigGet.mockReturnValue(false);
        (MessageDelayScheduler.getInstance as jest.Mock).mockReturnValue({
            scheduleMessage: mockScheduleMessage,
        });
        mockScheduleMessage.mockImplementation(async (channelId, messageId, text, userId, sendFn) => {
            await sendFn(text);
        });
    });

    it('should not process an empty message', async () => {
        const message = createMockMessage('');
        await handleMessage(message);
        expect(mockLlmProvider.generateChatCompletion).not.toHaveBeenCalled();
    });

    it('should process a message, call LLM, and schedule a reply', async () => {
        mockedShouldReplyToMessage.mockReturnValue(true);
        const message = createMockMessage('Hello bot');
        await handleMessage(message);

        expect(mockedStripBotId).toHaveBeenCalledWith('Hello bot', 'bot-id');
        expect(mockedAddUserHint).toHaveBeenCalled();
        expect(mockedShouldReplyToMessage).toHaveBeenCalled();
        expect(mockLlmProvider.generateChatCompletion).toHaveBeenCalledWith('Hello bot', [], expect.any(Object));
        expect(mockScheduleMessage).toHaveBeenCalled();
        expect(mockMessengerProvider.sendMessageToChannel).toHaveBeenCalledWith('test-channel', 'LLM response', expect.any(String));
    });

    it('should not reply if shouldReplyToMessage returns false', async () => {
        mockedShouldReplyToMessage.mockReturnValue(false);
        const message = createMockMessage('Just a random message');
        await handleMessage(message);
        expect(mockedShouldReplyToMessage).toHaveBeenCalled();
        expect(mockLlmProvider.generateChatCompletion).not.toHaveBeenCalled();
    });

    it('should handle inline commands and skip LLM call', async () => {
        mockedMessageConfigGet.mockImplementation(key => {
            if (key === 'MESSAGE_COMMAND_INLINE') return true;
            if (key === 'MESSAGE_COMMAND_AUTHORISED_USERS') return 'test-user';
            return false;
        });
        mockedProcessCommand.mockImplementation(async (message, callback) => {
            await callback('Command processed successfully');
        });

        const message = createMockMessage('!mycommand');
        await handleMessage(message);

        expect(mockedProcessCommand).toHaveBeenCalledTimes(1);
        expect(mockMessengerProvider.sendMessageToChannel).toHaveBeenCalledWith('test-channel', 'Command processed successfully', expect.any(String));
        expect(mockLlmProvider.generateChatCompletion).not.toHaveBeenCalled();
        expect(mockScheduleMessage).not.toHaveBeenCalled();
    });
    
    it('should call sendFollowUpRequest if enabled', async () => {
        mockedShouldReplyToMessage.mockReturnValue(true);
        mockedMessageConfigGet.mockImplementation(key => key === 'MESSAGE_LLM_FOLLOW_UP');

        const message = createMockMessage('Hello');
        await handleMessage(message, []);
        
        const scheduledSendFunction = mockScheduleMessage.mock.calls[0][4];
        await scheduledSendFunction('LLM response');

        expect(mockedSendFollowUpRequest).toHaveBeenCalled();
    });
});
