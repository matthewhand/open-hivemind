import { Request, Response } from 'express';
import { InteractiveActionHandlers } from '@integrations/slack/InteractiveActionHandlers';
import { SlackInteractiveHandler } from '@integrations/slack/SlackInteractiveHandler';

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
      let payload: any = {
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
      let payload: any = {
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
        user: { id: 'U123' },
      };

      await (handler as any).handleBlockAction(payload, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
      // Unknown actions should be passed to handleButtonClick
      expect(mockHandlers.handleButtonClick).toHaveBeenCalledWith('C123', 'U123', 'unknown_action');
    });

    it('should return 400 Bad Request when actions array is missing or empty', async () => {
      let payload: any = {
        type: 'block_actions'
        // actions field missing completely
      };

      await (handler as any).handleBlockAction(payload, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith('Bad Request');

      jest.clearAllMocks();
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as any;

      payload = {
        type: 'block_actions',
        actions: [] // empty actions array
      };

      await (handler as any).handleBlockAction(payload, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith('Bad Request');
    });

    it('should handle missing user object gracefully for getting_started action', async () => {
      const payload = {
        actions: [{ action_id: 'getting_started' }]
        // user object missing completely
      };

      process.env.SLACK_DEFAULT_CHANNEL_ID = 'C123';

      await (handler as any).handleBlockAction(payload, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();

      // Should fallback to 'unknown'
      expect(mockHandlers.sendInteractiveHelpMessage).toHaveBeenCalledWith('C123', 'unknown');
    });

    it('should handle missing trigger_id gracefully for ask_question action', async () => {
      const payload = {
        actions: [{ action_id: 'ask_question' }]
        // trigger_id missing
      };

      process.env.SLACK_DEFAULT_CHANNEL_ID = 'C123';

      await (handler as any).handleBlockAction(payload, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();

      // Should log and break without calling handler
      expect(mockHandlers.sendAskQuestionModal).not.toHaveBeenCalled();
    });
  });
});
