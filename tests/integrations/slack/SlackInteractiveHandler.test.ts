import { SlackInteractiveHandler } from '@src/integrations/slack/SlackInteractiveHandler';

describe('SlackInteractiveHandler', () => {
  let handler: SlackInteractiveHandler;
  let mockHandlers: any;

  beforeEach(() => {
    mockHandlers = {
      sendCourseInfo: jest.fn().mockResolvedValue(undefined),
      sendBookingInstructions: jest.fn().mockResolvedValue(undefined),
      sendStudyResources: jest.fn().mockResolvedValue(undefined),
      sendAskQuestionModal: jest.fn().mockResolvedValue(undefined),
      sendInteractiveHelpMessage: jest.fn().mockResolvedValue(undefined),
      handleButtonClick: jest.fn().mockResolvedValue(undefined)
    };
    
    handler = new SlackInteractiveHandler(mockHandlers);
  });

  it('should handle course info action', async () => {
    const payload = {
      actions: [{ action_id: 'course_info' }],
      channel: { id: 'C123' }
    };

    await handler.handleInteraction(payload as any);

    expect(mockHandlers.sendCourseInfo).toHaveBeenCalledWith('C123');
  });

  it('should handle booking instructions action', async () => {
    const payload = {
      actions: [{ action_id: 'booking_instructions' }],
      channel: { id: 'C123' }
    };

    await handler.handleInteraction(payload as any);

    expect(mockHandlers.sendBookingInstructions).toHaveBeenCalledWith('C123');
  });

  it('should handle study resources action', async () => {
    const payload = {
      actions: [{ action_id: 'study_resources' }],
      channel: { id: 'C123' }
    };

    await handler.handleInteraction(payload as any);

    expect(mockHandlers.sendStudyResources).toHaveBeenCalledWith('C123');
  });

  it('should handle ask question modal action', async () => {
    const payload = {
      actions: [{ action_id: 'ask_question' }],
      trigger_id: 'trigger123'
    };

    await handler.handleInteraction(payload as any);

    expect(mockHandlers.sendAskQuestionModal).toHaveBeenCalledWith('trigger123');
  });

  it('should handle help message action', async () => {
    const payload = {
      actions: [{ action_id: 'help' }],
      channel: { id: 'C123' },
      user: { id: 'U123' }
    };

    await handler.handleInteraction(payload as any);

    expect(mockHandlers.sendInteractiveHelpMessage).toHaveBeenCalledWith('C123', 'U123');
  });

  it('should handle button click action', async () => {
    const payload = {
      actions: [{ action_id: 'button_click' }],
      channel: { id: 'C123' },
      user: { id: 'U123' }
    };

    await handler.handleInteraction(payload as any);

    expect(mockHandlers.handleButtonClick).toHaveBeenCalledWith('C123', 'U123', 'button_click');
  });

  it('should handle unknown action gracefully', async () => {
    const payload = {
      actions: [{ action_id: 'unknown_action' }],
      channel: { id: 'C123' }
    };

    await expect(handler.handleInteraction(payload as any)).resolves.not.toThrow();
  });
});