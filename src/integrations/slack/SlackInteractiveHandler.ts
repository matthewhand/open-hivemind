import { Request, Response } from 'express';
import Debug from 'debug';
import { InteractiveActionHandlers } from './InteractiveActionHandlers';

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

  private async handleBlockAction(payload: any, res: Response): Promise<void> {
    try {
      const actionId = payload.actions[0].action_id;
      debug(`[Slack] Handling block action: ${actionId}`);
      // Immediately acknowledge the interactive action.
      res.status(200).send();

      const defaultChannel = process.env.SLACK_DEFAULT_CHANNEL_ID;
      if (!defaultChannel) {
        debug('[Slack] SLACK_DEFAULT_CHANNEL_ID is not set, cannot send block action response.');
        return;
      }

      if (actionId === 'getting_started') {
        await this.handlers.sendInteractiveHelpMessage(defaultChannel, payload.user.id);
      } else {
        switch (actionId) {
          case 'see_course_info':
            await this.handlers.sendCourseInfo(defaultChannel);
            break;
          case 'book_office_hours':
            await this.handlers.sendBookingInstructions(defaultChannel);
            break;
          case 'get_study_resources':
            await this.handlers.sendStudyResources(defaultChannel);
            break;
          case 'ask_question':
            await this.handlers.sendAskQuestionModal(payload.trigger_id);
            break;
          default:
            debug(`[Slack] Unhandled action: ${actionId}`);
        }
      }
    } catch (error) {
      debug(`[Slack] Error handling block action: ${error}`);
    }
  }

  private async handleViewSubmission(payload: any, res: Response): Promise<void> {
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
            debug('[Slack] SLACK_DEFAULT_CHANNEL_ID is not set, cannot send view submission response.');
            return;
          }
          // You can add additional logic here (e.g., sending a typing indicator)
          // and delegate further processing to your message handler if needed.
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
