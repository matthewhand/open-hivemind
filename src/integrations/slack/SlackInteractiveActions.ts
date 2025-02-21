import Debug from 'debug';
import { SlackBotManager } from './SlackBotManager';
import { SlackService } from './SlackService'; // Keep import for type safety

const debug = Debug('app:SlackInteractiveActions');

export class SlackInteractiveActions {
  private botManager: SlackBotManager;

  constructor(botManager: SlackBotManager) {
    this.botManager = botManager;
  }

  private getSlackService(): SlackService {
    return SlackService.getInstance(); // Lazy instantiation
  }

  public async sendCourseInfo(channel: string) {
    const botInfo = this.botManager.getBotByName('Jeeves') || this.botManager.getAllBots()[0];
    await this.getSlackService().sendMessage(channel, 'Course Info: Here are the details...', botInfo.botUserName || 'Jeeves');
  }

  public async sendBookingInstructions(channel: string) {
    const botInfo = this.botManager.getBotByName('Jeeves') || this.botManager.getAllBots()[0];
    await this.getSlackService().sendMessage(channel, 'Office Hours Booking: To book...', botInfo.botUserName || 'Jeeves');
  }

  public async sendStudyResources(channel: string) {
    const botInfo = this.botManager.getBotByName('Jeeves') || this.botManager.getAllBots()[0];
    await this.getSlackService().sendMessage(channel, 'Study Resources: Here are some...', botInfo.botUserName || 'Jeeves');
  }

  public async sendAskQuestionModal(triggerId: string) {
    const botInfo = this.botManager.getBotByName('Jeeves') || this.botManager.getAllBots()[0];
    await botInfo.webClient.views.open({
      trigger_id: triggerId,
      view: {
        type: 'modal',
        callback_id: 'ask_question_modal',
        title: { type: 'plain_text', text: 'Ask a Question' },
        submit: { type: 'plain_text', text: 'Submit' },
        close: { type: 'plain_text', text: 'Cancel' },
        blocks: [
          { type: 'input', block_id: 'user_input_block', element: { type: 'plain_text_input', action_id: 'user_input' }, label: { type: 'plain_text', text: 'Your Question' } }
        ]
      }
    });
  }

  public async sendInteractiveHelpMessage(channel: string, userId: string) {
    const botInfo = this.botManager.getBotByName('Jeeves') || this.botManager.getAllBots()[0];
    const blocks = [
      { type: 'section', text: { type: 'mrkdwn', text: `👋 *Hello <@${userId}>!* Welcome! How can I assist you?` } },
      { type: 'actions', elements: [
        { type: 'button', text: { type: 'plain_text', text: '📚 See Course Info' }, action_id: 'see_course_info', value: 'course_info' },
        { type: 'button', text: { type: 'plain_text', text: '📅 Book Office Hours' }, action_id: 'book_office_hours', value: 'office_hours' }
      ] },
      { type: 'actions', elements: [
        { type: 'button', text: { type: 'plain_text', text: '📖 Get Study Resources' }, action_id: 'get_study_resources', value: 'study_resources' },
        { type: 'button', text: { type: 'plain_text', text: '❓ Ask a Question' }, action_id: 'ask_question', value: 'ask_question' }
      ] },
      { type: 'section', text: { type: 'mrkdwn', text: `💡 *Need more help?* Type \`@university-bot help\` for commands.` } }
    ];
    await this.getSlackService().sendMessage(channel, 'Welcome! Here’s how to interact.', botInfo.botUserName || 'Jeeves'); // Blocks need integration—simplified
  }
}
