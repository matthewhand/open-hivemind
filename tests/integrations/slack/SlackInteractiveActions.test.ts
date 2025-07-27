import { SlackInteractiveActions } from '../../../src/integrations/slack/SlackInteractiveActions';
import { SlackService } from '../../../src/integrations/slack/SlackService';

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
          open: jest.fn().mockResolvedValue({ ok: true })
        }
      }
    };

    // Create mock bot manager
    mockBotManager = {
      getAllBots: jest.fn().mockReturnValue([mockBotInfo])
    };

    // Create mock SlackService
    mockSlackService = {
      getBotManager: jest.fn(),
      sendMessageToChannel: jest.fn().mockResolvedValue(undefined)
    };

    // Create instance
    slackInteractiveActions = new SlackInteractiveActions(mockSlackService as any);
  });

  describe('constructor', () => {
    it('should create an instance with valid SlackService', () => {
      expect(slackInteractiveActions).toBeInstanceOf(SlackInteractiveActions);
    });

    it('should throw error if SlackService is not provided', () => {
      expect(() => {
        new SlackInteractiveActions(null as any);
      }).toThrow('SlackService is required for SlackInteractiveActions');
    });

    it('should throw error if SlackService is undefined', () => {
      expect(() => {
        new SlackInteractiveActions(undefined as any);
      }).toThrow('SlackService is required for SlackInteractiveActions');
    });
  });

  describe('sendCourseInfo', () => {
    it('should send course info successfully', async () => {
      mockSlackService.getBotManager.mockReturnValue(mockBotManager);

      await slackInteractiveActions.sendCourseInfo('C1234567890');

      expect(mockSlackService.getBotManager).toHaveBeenCalled();
      expect(mockBotManager.getAllBots).toHaveBeenCalled();
      expect(mockSlackService.sendMessageToChannel).toHaveBeenCalledWith(
        'C1234567890',
        'Course Info: Here are the details...',
        'TestBot'
      );
    });

    it('should use default bot name when botUserName is not provided', async () => {
      mockBotInfo.botUserName = undefined;
      mockSlackService.getBotManager.mockReturnValue(mockBotManager);

      await slackInteractiveActions.sendCourseInfo('C1234567890');

      expect(mockSlackService.sendMessageToChannel).toHaveBeenCalledWith(
        'C1234567890',
        'Course Info: Here are the details...',
        'Jeeves'
      );
    });

    it('should return early when no bot manager is available', async () => {
      mockSlackService.getBotManager.mockReturnValue(undefined);

      await slackInteractiveActions.sendCourseInfo('C1234567890');

      expect(mockSlackService.sendMessageToChannel).not.toHaveBeenCalled();
    });

    it('should return early when no bots are available', async () => {
      mockBotManager.getAllBots.mockReturnValue([]);
      mockSlackService.getBotManager.mockReturnValue(mockBotManager);

      await slackInteractiveActions.sendCourseInfo('C1234567890');

      expect(mockSlackService.sendMessageToChannel).not.toHaveBeenCalled();
    });

    it('should handle errors when sending message fails', async () => {
      mockSlackService.getBotManager.mockReturnValue(mockBotManager);
      mockSlackService.sendMessageToChannel.mockRejectedValue(new Error('Network error'));

      await expect(slackInteractiveActions.sendCourseInfo('C1234567890')).rejects.toThrow('Network error');
    });
  });

  describe('sendBookingInstructions', () => {
    it('should send booking instructions successfully', async () => {
      mockSlackService.getBotManager.mockReturnValue(mockBotManager);

      await slackInteractiveActions.sendBookingInstructions('C1234567890');

      expect(mockSlackService.sendMessageToChannel).toHaveBeenCalledWith(
        'C1234567890',
        'Office Hours Booking: To book office hours, use the /office-hours command followed by your preferred time slot. Available slots are Monday-Friday 2-4 PM.',
        'TestBot'
      );
    });

    it('should return early when no bot manager is available', async () => {
      mockSlackService.getBotManager.mockReturnValue(undefined);

      await slackInteractiveActions.sendBookingInstructions('C1234567890');

      expect(mockSlackService.sendMessageToChannel).not.toHaveBeenCalled();
    });

    it('should return early when no bots are available', async () => {
      mockBotManager.getAllBots.mockReturnValue([]);
      mockSlackService.getBotManager.mockReturnValue(mockBotManager);

      await slackInteractiveActions.sendBookingInstructions('C1234567890');

      expect(mockSlackService.sendMessageToChannel).not.toHaveBeenCalled();
    });
  });

  describe('sendStudyResources', () => {
    it('should send study resources successfully', async () => {
      mockSlackService.getBotManager.mockReturnValue(mockBotManager);

      await slackInteractiveActions.sendStudyResources('C1234567890');

      expect(mockSlackService.sendMessageToChannel).toHaveBeenCalledWith(
        'C1234567890',
        'Study Resources: Here are some recommended resources to help with your learning journey...',
        'TestBot'
      );
    });

    it('should return early when no bot manager is available', async () => {
      mockSlackService.getBotManager.mockReturnValue(undefined);

      await slackInteractiveActions.sendStudyResources('C1234567890');

      expect(mockSlackService.sendMessageToChannel).not.toHaveBeenCalled();
    });

    it('should return early when no bots are available', async () => {
      mockBotManager.getAllBots.mockReturnValue([]);
      mockSlackService.getBotManager.mockReturnValue(mockBotManager);

      await slackInteractiveActions.sendStudyResources('C1234567890');

      expect(mockSlackService.sendMessageToChannel).not.toHaveBeenCalled();
    });
  });

  describe('sendAskQuestionModal', () => {
    it('should open modal successfully', async () => {
      mockSlackService.getBotManager.mockReturnValue(mockBotManager);

      await slackInteractiveActions.sendAskQuestionModal('12345.67890');

      expect(mockBotInfo.webClient.views.open).toHaveBeenCalledWith({
        trigger_id: '12345.67890',
        view: expect.objectContaining({
          type: 'modal',
          callback_id: 'ask_question_callback',
          title: { type: 'plain_text', text: 'Ask a Question', emoji: true },
          submit: { type: 'plain_text', text: 'Submit', emoji: true },
          close: { type: 'plain_text', text: 'Cancel', emoji: true },
          blocks: expect.arrayContaining([
            expect.objectContaining({
              type: 'input',
              element: { type: 'plain_text_input', action_id: 'question_input', multiline: true },
              label: { type: 'plain_text', text: 'Your Question', emoji: true }
            })
          ])
        })
      });
    });

    it('should return early when no bot manager is available', async () => {
      mockSlackService.getBotManager.mockReturnValue(undefined);

      await slackInteractiveActions.sendAskQuestionModal('12345.67890');

      expect(mockBotInfo.webClient.views.open).not.toHaveBeenCalled();
    });

    it('should return early when no bots are available', async () => {
      mockBotManager.getAllBots.mockReturnValue([]);
      mockSlackService.getBotManager.mockReturnValue(mockBotManager);

      await slackInteractiveActions.sendAskQuestionModal('12345.67890');

      expect(mockBotInfo.webClient.views.open).not.toHaveBeenCalled();
    });

    it('should handle modal opening errors gracefully', async () => {
      mockSlackService.getBotManager.mockReturnValue(mockBotManager);
      mockBotInfo.webClient.views.open.mockRejectedValue(new Error('API Error'));

      await expect(slackInteractiveActions.sendAskQuestionModal('12345.67890')).rejects.toThrow('API Error');
    });
  });

  describe('sendInteractiveHelpMessage', () => {
    it('should send help message successfully', async () => {
      mockSlackService.getBotManager.mockReturnValue(mockBotManager);

      await slackInteractiveActions.sendInteractiveHelpMessage('C1234567890', 'U1234567890');

      expect(mockSlackService.sendMessageToChannel).toHaveBeenCalledWith(
        'C1234567890',
        expect.stringContaining('Welcome <@U1234567890>!'),
        'TestBot'
      );
    });

    it('should return early when no bot manager is available', async () => {
      mockSlackService.getBotManager.mockReturnValue(undefined);

      await slackInteractiveActions.sendInteractiveHelpMessage('C1234567890', 'U1234567890');

      expect(mockSlackService.sendMessageToChannel).not.toHaveBeenCalled();
    });

    it('should return early when no bots are available', async () => {
      mockBotManager.getAllBots.mockReturnValue([]);
      mockSlackService.getBotManager.mockReturnValue(mockBotManager);

      await slackInteractiveActions.sendInteractiveHelpMessage('C1234567890', 'U1234567890');

      expect(mockSlackService.sendMessageToChannel).not.toHaveBeenCalled();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle multiple bots and use the first one', async () => {
      const botInfo2 = { botUserName: 'SecondBot', webClient: { views: { open: jest.fn() } } };
      mockBotManager.getAllBots.mockReturnValue([mockBotInfo, botInfo2]);
      mockSlackService.getBotManager.mockReturnValue(mockBotManager);

      await slackInteractiveActions.sendCourseInfo('C1234567890');

      expect(mockSlackService.sendMessageToChannel).toHaveBeenCalledWith(
        'C1234567890',
        expect.any(String),
        'TestBot'
      );
    });

    it('should handle empty string channel gracefully', async () => {
      mockSlackService.getBotManager.mockReturnValue(mockBotManager);

      await slackInteractiveActions.sendCourseInfo('');

      expect(mockSlackService.sendMessageToChannel).toHaveBeenCalledWith(
        '',
        expect.any(String),
        'TestBot'
      );
    });

    it('should handle empty string userId in help message', async () => {
      mockSlackService.getBotManager.mockReturnValue(mockBotManager);

      await slackInteractiveActions.sendInteractiveHelpMessage('C1234567890', '');

      expect(mockSlackService.sendMessageToChannel).toHaveBeenCalledWith(
        'C1234567890',
        expect.stringContaining('Welcome <@>!'),
        'TestBot'
      );
    });
  });
});