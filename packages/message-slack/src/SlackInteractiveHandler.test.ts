import type { Request, Response } from 'express';
import { SlackInteractiveHandler, type SlackActionContext } from './SlackInteractiveHandler';

const makeRes = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

const blockActionsPayload = (action: any, overrides: any = {}) => ({
  type: 'block_actions',
  user: { id: 'U123', username: 'alice' },
  channel: { id: 'C456' },
  trigger_id: 'trigger-1',
  actions: [action],
  ...overrides,
});

const makeReq = (payload: any) =>
  ({ body: { payload: JSON.stringify(payload) } }) as unknown as Request;

describe('SlackInteractiveHandler', () => {
  describe('registry dispatch', () => {
    it('dispatches an exact action_id match to the registered handler', async () => {
      const defaultHandler = jest.fn();
      const handler = new SlackInteractiveHandler(defaultHandler);
      const approve = jest.fn();
      handler.registerAction('approve_request', approve);

      const res = makeRes();
      await handler.handleRequest(
        makeReq(
          blockActionsPayload({
            action_id: 'approve_request',
            value: 'req-42',
            text: { type: 'plain_text', text: 'Approve' },
          })
        ),
        res
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(approve).toHaveBeenCalledTimes(1);
      const context: SlackActionContext = approve.mock.calls[0][0];
      expect(context).toMatchObject({
        actionId: 'approve_request',
        type: 'block_actions',
        channelId: 'C456',
        userId: 'U123',
        userName: 'alice',
        value: 'req-42',
        text: 'Approve',
        triggerId: 'trigger-1',
      });
      expect(defaultHandler).not.toHaveBeenCalled();
    });

    it('dispatches RegExp pattern matches in registration order', async () => {
      const defaultHandler = jest.fn();
      const handler = new SlackInteractiveHandler(defaultHandler);
      const welcome = jest.fn();
      handler.registerAction(/^learn_more_/, welcome);

      const res = makeRes();
      await handler.handleBlockAction(blockActionsPayload({ action_id: 'learn_more_C456' }), res);

      expect(welcome).toHaveBeenCalledTimes(1);
      expect(welcome.mock.calls[0][0].actionId).toBe('learn_more_C456');
      expect(defaultHandler).not.toHaveBeenCalled();
    });

    it('prefers exact string matches over RegExp patterns', async () => {
      const handler = new SlackInteractiveHandler(jest.fn());
      const regexHandler = jest.fn();
      const exactHandler = jest.fn();
      handler.registerAction(/^deploy_/, regexHandler);
      handler.registerAction('deploy_prod', exactHandler);

      await handler.handleBlockAction(blockActionsPayload({ action_id: 'deploy_prod' }), makeRes());

      expect(exactHandler).toHaveBeenCalledTimes(1);
      expect(regexHandler).not.toHaveBeenCalled();
    });

    it('supports unregistering patterns', async () => {
      const defaultHandler = jest.fn();
      const handler = new SlackInteractiveHandler(defaultHandler);
      const fn = jest.fn();
      handler.registerAction('a', fn);
      expect(handler.unregisterAction('a')).toBe(true);

      await handler.handleBlockAction(blockActionsPayload({ action_id: 'a' }), makeRes());

      expect(fn).not.toHaveBeenCalled();
      expect(defaultHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('default forward path', () => {
    it('acknowledges and forwards unknown actions to the default handler', async () => {
      const defaultHandler = jest.fn();
      const handler = new SlackInteractiveHandler(defaultHandler);

      const res = makeRes();
      await handler.handleRequest(
        makeReq(
          blockActionsPayload({
            action_id: 'totally_custom_action',
            value: 'ask the bot something',
          })
        ),
        res
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalled();
      expect(defaultHandler).toHaveBeenCalledTimes(1);
      expect(defaultHandler.mock.calls[0][0]).toMatchObject({
        actionId: 'totally_custom_action',
        value: 'ask the bot something',
        type: 'block_actions',
      });
    });

    it('extracts values from static_select actions', async () => {
      const defaultHandler = jest.fn();
      const handler = new SlackInteractiveHandler(defaultHandler);

      await handler.handleBlockAction(
        blockActionsPayload({
          action_id: 'pick_option',
          selected_option: { value: 'option-b', text: { type: 'plain_text', text: 'Option B' } },
        }),
        makeRes()
      );

      expect(defaultHandler.mock.calls[0][0].value).toBe('option-b');
    });

    it('dispatches each action in a multi-action payload', async () => {
      const defaultHandler = jest.fn();
      const handler = new SlackInteractiveHandler(defaultHandler);

      await handler.handleBlockAction(
        blockActionsPayload(
          { action_id: 'first' },
          { actions: [{ action_id: 'first' }, { action_id: 'second' }] }
        ),
        makeRes()
      );

      expect(defaultHandler).toHaveBeenCalledTimes(2);
      expect(defaultHandler.mock.calls.map((c) => c[0].actionId)).toEqual(['first', 'second']);
    });
  });

  describe('unknown action acknowledgement', () => {
    it('acknowledges even when no default handler is configured', async () => {
      const handler = new SlackInteractiveHandler();

      const res = makeRes();
      await expect(
        handler.handleRequest(makeReq(blockActionsPayload({ action_id: 'mystery' })), res)
      ).resolves.toBeUndefined();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalled();
    });

    it('acknowledges payloads with an empty actions array without dispatching', async () => {
      const defaultHandler = jest.fn();
      const handler = new SlackInteractiveHandler(defaultHandler);

      const res = makeRes();
      await handler.handleBlockAction({ type: 'block_actions', actions: [] }, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(defaultHandler).not.toHaveBeenCalled();
    });

    it('acknowledges unknown payload types', async () => {
      const handler = new SlackInteractiveHandler(jest.fn());
      const res = makeRes();
      await handler.handleRequest(makeReq({ type: 'shortcut' }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('swallows handler errors after the request has been acknowledged', async () => {
      const handler = new SlackInteractiveHandler(jest.fn());
      handler.registerAction('boom', () => {
        throw new Error('handler exploded');
      });

      const res = makeRes();
      await expect(
        handler.handleBlockAction(blockActionsPayload({ action_id: 'boom' }), res)
      ).resolves.toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 400 for malformed payloads', async () => {
      const handler = new SlackInteractiveHandler(jest.fn());
      const res = makeRes();
      await handler.handleRequest({ body: { payload: 'not-json{' } } as unknown as Request, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('Bad Request');
    });
  });

  describe('view_submission dispatch', () => {
    const viewSubmissionPayload = {
      type: 'view_submission',
      user: { id: 'U123', username: 'alice' },
      view: {
        callback_id: 'feedback_modal',
        title: { type: 'plain_text', text: 'Feedback' },
        state: {
          values: {
            block_one: { rating: { type: 'static_select', selected_option: { value: 'great' } } },
            block_two: { comments: { type: 'plain_text_input', value: 'Loved it' } },
          },
        },
      },
    };

    it('acknowledges with response_action clear and routes by callback_id', async () => {
      const defaultHandler = jest.fn();
      const handler = new SlackInteractiveHandler(defaultHandler);
      const feedback = jest.fn();
      handler.registerAction('feedback_modal', feedback);

      const res = makeRes();
      await handler.handleRequest(makeReq(viewSubmissionPayload), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ response_action: 'clear' });
      expect(feedback).toHaveBeenCalledTimes(1);
      const context: SlackActionContext = feedback.mock.calls[0][0];
      expect(context.actionId).toBe('feedback_modal');
      expect(context.type).toBe('view_submission');
      expect(context.value).toBe('great\nLoved it');
      expect(defaultHandler).not.toHaveBeenCalled();
    });

    it('forwards unmatched submissions to the default handler', async () => {
      const defaultHandler = jest.fn();
      const handler = new SlackInteractiveHandler(defaultHandler);

      await handler.handleViewSubmission(viewSubmissionPayload, makeRes());

      expect(defaultHandler).toHaveBeenCalledTimes(1);
      expect(defaultHandler.mock.calls[0][0]).toMatchObject({
        actionId: 'feedback_modal',
        type: 'view_submission',
        value: 'great\nLoved it',
        userId: 'U123',
      });
    });
  });
});
