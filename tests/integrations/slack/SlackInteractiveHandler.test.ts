import { SlackInteractiveHandler } from '@integrations/slack/SlackInteractiveHandler';
import { InteractiveActionHandlers } from '@integrations/slack/InteractiveActionHandlers';
import { Request, Response } from 'express';

describe('SlackInteractiveHandler', () => {
  let mockHandlers: jest.Mocked<InteractiveActionHandlers>;
  let handler: SlackInteractiveHandler;
  let mockRequest: Partial<Request>;
  let mockResponse: jest.Mocked<Response>;

  beforeEach(() => {
    // Create mock handlers
    mockHandlers = {
      sendCourseInfo: jest.fn().mockResolvedValue(undefined),
      sendBookingInstructions: jest.fn().mockResolvedValue(undefined),
      sendStudyResources: jest.fn().mockResolvedValue(undefined),
      sendAskQuestionModal: jest.fn().mockResolvedValue(undefined),
      sendInteractiveHelpMessage: jest.fn().mockResolvedValue(undefined),
      handleButtonClick: jest.fn().mockResolvedValue(undefined),
    };

    // Create handler instance
    handler = new SlackInteractiveHandler(mockHandlers);

    // Create mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any;
  });

  describe('constructor', () => {
    it('should create instance with handlers', () => {
      expect(handler).toBeDefined();
      expect((handler as any).handlers).toBe(mockHandlers);
    });
  });

  describe('handleRequest', () => {
    it('should handle block_actions payload type', async () => {
      const payload = {
        type: 'block_actions',
        actions: [{ action_id: 'see_course_info' }],
        user: { id: 'U123' },
        trigger_id: 'trigger123'
      };

      mockRequest = {
        body: {
          payload: JSON.stringify(payload)
        }
      };

      process.env.SLACK_DEFAULT_CHANNEL_ID = 'C123';

      await handler.handleRequest(mockRequest as Request, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
      expect(mockHandlers.sendCourseInfo).toHaveBeenCalledWith('C123');
    });

    it('should handle view_submission payload type', async () => {
      const payload = {
        type: 'view_submission',
        view: {
          state: {
            values: {
              user_input_block: {
                user_input: { value: 'Test question' }
              }
            }
          }
        }
      };

      mockRequest = {
        body: {
          payload: JSON.stringify(payload)
        }
      };

      process.env.SLACK_DEFAULT_CHANNEL_ID = 'C123';

      await handler.handleRequest(mockRequest as Request, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ response_action: 'clear' });
    });

    it('should handle unknown payload type', async () => {
      const payload = {
        type: 'unknown_type'
      };

      mockRequest = {
        body: {
          payload: JSON.stringify(payload)
        }
      };

      await handler.handleRequest(mockRequest as Request, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should handle invalid JSON payload', async () => {
      mockRequest = {
        body: {
          payload: 'invalid json'
        }
      };

      await handler.handleRequest(mockRequest as Request, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith('Bad Request');
    });
  });

  describe('handleBlockAction', () => {
    it('should handle see_course_info action', async () => {
      const payload = {
        actions: [{ action_id: 'see_course_info' }]
      };

      process.env.SLACK_DEFAULT_CHANNEL_ID = 'C123';

      await (handler as any).handleBlockAction(payload, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
      expect(mockHandlers.sendCourseInfo).toHaveBeenCalledWith('C123');
    });

    it('should handle unknown action', async () => {
      const payload = {
        actions: [{ action_id: 'unknown_action' }]
      };

      process.env.SLACK_DEFAULT_CHANNEL_ID = 'C123';

      await (handler as any).handleBlockAction(payload, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
      // Unknown actions should not call any handlers
      expect(mockHandlers.sendCourseInfo).not.toHaveBeenCalled();
    });
  });
});