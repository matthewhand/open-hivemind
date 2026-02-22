import { Request, Response } from 'express';
import { InteractiveActionHandlers } from '@hivemind/adapter-slack/InteractiveActionHandlers';
import { SlackInteractiveHandler } from '@hivemind/adapter-slack/SlackInteractiveHandler';

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
    it('should handle various request scenarios', async () => {
      // Test block_actions payload type
      let payload = {
        type: 'block_actions',
        actions: [{ action_id: 'see_course_info' }],
        user: { id: 'U123' },
        trigger_id: 'trigger123',
      };

      mockRequest = {
        body: {
          payload: JSON.stringify(payload),
        },
      };

      process.env.SLACK_DEFAULT_CHANNEL_ID = 'C123';

      await handler.handleRequest(mockRequest as Request, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
      expect(mockHandlers.sendCourseInfo).toHaveBeenCalledWith('C123');

      // Reset mocks and test view_submission payload type
      jest.clearAllMocks();
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as any;

      payload = {
        type: 'view_submission',
        view: {
          state: {
            values: {
              user_input_block: {
                user_input: { value: 'Test question' },
              },
            },
          },
        },
      };

      mockRequest = {
        body: {
          payload: JSON.stringify(payload),
        },
      };

      await handler.handleRequest(mockRequest as Request, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ response_action: 'clear' });

      // Reset mocks and test unknown payload type
      jest.clearAllMocks();
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as any;

      payload = {
        type: 'unknown_type',
      };

      mockRequest = {
        body: {
          payload: JSON.stringify(payload),
        },
      };

      await handler.handleRequest(mockRequest as Request, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();

      // Reset mocks and test invalid JSON payload
      jest.clearAllMocks();
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as any;

      mockRequest = {
        body: {
          payload: 'invalid json',
        },
      };

      await handler.handleRequest(mockRequest as Request, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith('Bad Request');
    });
  });

  describe('handleBlockAction', () => {
    it('should handle block action scenarios', async () => {
      // Test see_course_info action
      let payload = {
        actions: [{ action_id: 'see_course_info' }],
      };

      process.env.SLACK_DEFAULT_CHANNEL_ID = 'C123';

      await (handler as any).handleBlockAction(payload, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
      expect(mockHandlers.sendCourseInfo).toHaveBeenCalledWith('C123');

      // Reset mocks and test unknown action
      jest.clearAllMocks();
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as any;

      payload = {
        actions: [{ action_id: 'unknown_action' }],
      };

      await (handler as any).handleBlockAction(payload, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
      // Unknown actions should not call any handlers
      expect(mockHandlers.sendCourseInfo).not.toHaveBeenCalled();
    });
  });
});
