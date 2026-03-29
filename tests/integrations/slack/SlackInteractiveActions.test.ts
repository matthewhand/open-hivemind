import { SlackInteractiveActions } from '@src/integrations/slack/SlackInteractiveActions';
import { SlackService } from '@src/integrations/slack/SlackService';

// Create a proper mock type
type MockedSlackService = {
  getBotManager: jest.Mock;
  sendMessageToChannel: jest.Mock;
};

describe('SlackInteractiveActions', () => {
  let slackInteractiveActions: SlackInteractiveActions;
  let mockSlackService: MockedSlackService;
  let mockBotManager: any;
  let mockBotInfo: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock bot info
    mockBotInfo = {
      botUserName: 'TestBot',
      webClient: {
        views: {
          open: jest.fn().mockResolvedValue({ ok: true }),
        },
      },
    };

    // Create mock bot manager
    mockBotManager = {
      getAllBots: jest.fn().mockReturnValue([mockBotInfo]),
    };

    // Create mock SlackService
    mockSlackService = {
      getBotManager: jest.fn(),
      sendMessageToChannel: jest.fn().mockResolvedValue(undefined),
    };

    // Create instance
    slackInteractiveActions = new SlackInteractiveActions(mockSlackService as any);
  });

  it('should handle constructor, messaging, and modal operations', async () => {
    // Test constructor validation
    expect(slackInteractiveActions).toBeInstanceOf(SlackInteractiveActions);
    expect(() => new SlackInteractiveActions(null as any)).toThrow(
      'SlackService is required for SlackInteractiveActions'
    );
    expect(() => new SlackInteractiveActions(undefined as any)).toThrow(
      'SlackService is required for SlackInteractiveActions'
    );

    // Test sendCourseInfo functionality
    mockSlackService.getBotManager.mockReturnValue(mockBotManager);
    await slackInteractiveActions.sendCourseInfo('C1234567890');
    expect(mockSlackService.sendMessageToChannel).toHaveBeenCalledWith(
      'C1234567890',
      'Course Info: Here are the details...',
      'TestBot'
    );

    // Test default bot name fallback
    jest.clearAllMocks();
    mockBotInfo.botUserName = undefined;
    mockSlackService.getBotManager.mockReturnValue(mockBotManager);
    await slackInteractiveActions.sendCourseInfo('C1234567890');
    expect(mockSlackService.sendMessageToChannel).toHaveBeenCalledWith(
      'C1234567890',
      'Course Info: Here are the details...',
      'Jeeves'
    );

    // Test sendAskQuestionModal
    jest.clearAllMocks();
    await slackInteractiveActions.sendAskQuestionModal('12345.67890');
    expect(mockBotInfo.webClient.views.open).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger_id: '12345.67890',
        view: expect.objectContaining({
          type: 'modal',
          callback_id: 'ask_question_callback',
        }),
      })
    );

    // Test modal error handling
    jest.clearAllMocks();
    mockBotInfo.webClient.views.open.mockRejectedValue(new Error('API Error'));
    await expect(slackInteractiveActions.sendAskQuestionModal('12345.67890')).rejects.toThrow(
      'API Error'
    );

    // Test no bot manager scenarios
    jest.clearAllMocks();
    mockSlackService.getBotManager.mockReturnValue(undefined);
    await slackInteractiveActions.sendCourseInfo('C1234567890');
    expect(mockSlackService.sendMessageToChannel).not.toHaveBeenCalled();

    // Test no bots available scenarios
    jest.clearAllMocks();
    mockBotManager.getAllBots.mockReturnValue([]);
    mockSlackService.getBotManager.mockReturnValue(mockBotManager);
    await slackInteractiveActions.sendCourseInfo('C1234567890');
    expect(mockSlackService.sendMessageToChannel).not.toHaveBeenCalled();
  });
});
