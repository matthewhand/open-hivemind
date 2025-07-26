import { SlackService } from './SlackService';
import Debug from 'debug';

const debug = Debug('app:SlackInteractiveActions');

export class SlackInteractiveActions {
  private slackService: SlackService;
  private readonly modalTitle = 'Ask a Question';
  private readonly modalCallbackId = 'ask_question_callback';

  constructor(slackService: SlackService) {
    this.slackService = slackService;
  }

  public async sendCourseInfo(channel: string): Promise<void> {
    const botManager = this.slackService.getBotManager();
    if (!botManager) return;
    
    const bots = botManager.getAllBots();
    if (bots.length === 0) return;
    
    const botInfo = bots[0];
    await this.slackService.sendMessageToChannel(channel, 'Course Info: Here are the details...', botInfo.botUserName || 'Jeeves');
  }

  public async sendBookingInstructions(channel: string): Promise<void> {
    const botManager = this.slackService.getBotManager();
    if (!botManager) return;
    
    const bots = botManager.getAllBots();
    if (bots.length === 0) return;
    
    const botInfo = bots[0];
    await this.slackService.sendMessageToChannel(channel, 'Office Hours Booking: To book...', botInfo.botUserName || 'Jeeves');
  }

  public async sendStudyResources(channel: string): Promise<void> {
    const botManager = this.slackService.getBotManager();
    if (!botManager) return;
    
    const bots = botManager.getAllBots();
    if (bots.length === 0) return;
    
    const botInfo = bots[0];
    await this.slackService.sendMessageToChannel(channel, 'Study Resources: Here are some...', botInfo.botUserName || 'Jeeves');
  }

  public async sendAskQuestionModal(triggerId: string): Promise<void> {
    const botManager = this.slackService.getBotManager();
    if (!botManager) return;
    
    const bots = botManager.getAllBots();
    if (bots.length === 0) return;
    
    const botInfo = bots[0];
    try {
      await botInfo.webClient.views.open({
        trigger_id: triggerId,
        view: {
          type: 'modal',
          callback_id: this.modalCallbackId,
          title: { type: 'plain_text', text: this.modalTitle, emoji: true },
          submit: { type: 'plain_text', text: 'Submit', emoji: true },
          close: { type: 'plain_text', text: 'Cancel', emoji: true },
          blocks: [{
            type: 'input',
            element: { type: 'plain_text_input', action_id: 'question_input', multiline: true },
            label: { type: 'plain_text', text: 'Your Question', emoji: true },
          }],
        },
      });
      debug('Modal opened successfully');
    } catch (error) {
      debug(`Failed to open modal: ${error}`);
    }
  }

  public async sendInteractiveHelpMessage(channel: string, userId: string): Promise<void> {
    const botManager = this.slackService.getBotManager();
    if (!botManager) return;
    
    const bots = botManager.getAllBots();
    if (bots.length === 0) return;
    
    const botInfo = bots[0];
    await this.slackService.sendMessageToChannel(channel, 'Welcome! Here’s how to interact.', botInfo.botUserName || 'Jeeves'); // Blocks need integration—simplified
  }

  private getSlackService(): SlackService {
    return this.slackService;
  }
}
