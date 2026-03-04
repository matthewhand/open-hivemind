import Debug from 'debug';
import type { Request, Response } from 'express';
import type { InteractiveActionHandlers } from './InteractiveActionHandlers';

const debug = Debug('app:SlackInteractiveHandler');

export class SlackInteractiveHandler {
  private handlers: InteractiveActionHandlers;

  constructor(handlers: InteractiveActionHandlers) {
    this.handlers = handlers;
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    try {
      const payload = JSON.parse(req.body.payload);
      debug(`Parsed interactive payload: ${JSON.stringify(payload)}`);
      if (payload.type === 'block_actions') {
        await this.handleBlockAction(payload, res);
      } else if (payload.type === 'view_submission') {
        await this.handleViewSubmission(payload, res);
      } else {
        res.status(200).send();
      }
    } catch (error) {
      debug(`Error handling interactive request: ${error}`);
      res.status(400).send('Bad Request');
    }
  }

  /**
   * Handles incoming block_actions payloads from Slack.
   *
   * @param payload The parsed Slack interactive payload object.
   * @param res The Express response object for immediately acknowledging the request.
   *
   * @description
   * This method inspects the `actionId` of the primary action block. It attempts to match it against
   * known built-in commands like `getting_started`, `see_course_info`, etc.
   *
   * **Fallback Behavior**:
   * If the `actionId` doesn't match a known handler, it triggers a fallback flow by forwarding the action
   * to `this.handlers.handleButtonClick()`. This is essential for dynamically generated buttons or dynamically
   * configured action mappings, allowing generic handlers (like the Welcome handler) to respond to unhandled
   * buttons.
   */
  async handleBlockAction(payload: any, res: Response): Promise<void> {
    try {
      if (!payload.actions || payload.actions.length === 0) {
        debug('[Slack] Received block_actions payload with no actions.');
        res.status(400).send('Bad Request: No actions found');
        return;
      }

      const actionId = payload.actions[0].action_id;
      debug(`[Slack] Handling block action: ${actionId}`);
      // Immediately acknowledge the interactive action.
      res.status(200).send();

      const fallbackChannelId = process.env.SLACK_DEFAULT_CHANNEL_ID;
      if (!fallbackChannelId) {
        debug('[Slack] SLACK_DEFAULT_CHANNEL_ID is not set, cannot send block action response.');
        return;
      }

      const userId = payload.user?.id || 'unknown';

      if (actionId === 'getting_started') {
        await this.handlers.sendInteractiveHelpMessage(fallbackChannelId, userId);
      } else {
        switch (actionId) {
          case 'see_course_info':
            await this.handlers.sendCourseInfo(fallbackChannelId);
            break;
          case 'book_office_hours':
            await this.handlers.sendBookingInstructions(fallbackChannelId);
            break;
          case 'get_study_resources':
            await this.handlers.sendStudyResources(fallbackChannelId);
            break;
          case 'ask_question':
            await this.handlers.sendAskQuestionModal(payload.trigger_id);
            break;
          default:
            debug(
              `[Slack] Forwarding unknown action to handleButtonClick: ${actionId} for user ${userId} in channel ${fallbackChannelId}`
            );
            await this.handlers.handleButtonClick(fallbackChannelId, userId, actionId);
            break;
        }
      }
    } catch (error) {
      debug(`[Slack] Error handling block action: ${error}`);
      if (!res.headersSent) {
        res.status(500).send('Internal Server Error');
      }
    }
  }

  async handleViewSubmission(payload: any, res: Response): Promise<void> {
    try {
      debug(`[Slack] Handling modal submission: ${JSON.stringify(payload.view.state.values)}`);
      res.status(200).json({ response_action: 'clear' });
      setImmediate(async () => {
        try {
          const submittedValues = payload.view.state.values;
          const userInput = submittedValues?.user_input_block?.user_input?.value || '';
          debug(`[Slack] (Async) User submitted: ${userInput}`);
          const defaultChannel = process.env.SLACK_DEFAULT_CHANNEL_ID;
          if (!defaultChannel) {
            debug(
              '[Slack] SLACK_DEFAULT_CHANNEL_ID is not set, cannot send view submission response.'
            );
            return;
          }
          // TODO: Wire `userInput` to a real message handler or persistence layer.
          // Currently, the extracted modal submission data is only logged for debugging.
          debug(`[Slack] Stub: View submission data captured but not yet processed: ${userInput}`);
        } catch (asyncError) {
          debug(`[Slack] (Async) Error processing view_submission: ${asyncError}`);
        }
      });
    } catch (error) {
      debug(`[Slack] Error handling view_submission: ${error}`);
      res.status(500).send('Internal Server Error');
    }
  }
}
