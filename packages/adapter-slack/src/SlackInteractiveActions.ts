import type { SlackService } from './SlackService';
import Debug from 'debug';

const debug = Debug('app:SlackInteractiveActions');

/**
 * SlackInteractiveActions - Handles interactive Slack features and user engagement
 * 
 * This class provides comprehensive interactive functionality for Slack bots,
 * including modal dialogs, interactive messages, and user engagement features.
 * It serves as a centralized handler for all interactive Slack components
 * that enhance user experience beyond simple text messaging.
 * 
 * @class SlackInteractiveActions
 * @example
 * ```typescript
 * const slackService = new SlackService();
 * const interactiveActions = new SlackInteractiveActions(slackService);
 * 
 * // Send a modal dialog
 * await interactiveActions.sendAskQuestionModal('trigger_12345');
 * 
 * // Send course information
 * await interactiveActions.sendCourseInfo('general');
 * ```
 */
export class SlackInteractiveActions {
  private slackService: SlackService;
  private readonly modalTitle = 'Ask a Question';
  private readonly modalCallbackId = 'ask_question_callback';

  /**
   * Creates an instance of SlackInteractiveActions.
   * 
   * @param {SlackService} slackService - The Slack service instance for sending messages
   * @throws {Error} Throws error if slackService is not provided
   * 
   * @example
   * ```typescript
   * const slackService = new SlackService();
   * const actions = new SlackInteractiveActions(slackService);
   * ```
   */
  constructor(slackService: SlackService) {
    if (!slackService) {
      throw new Error('SlackService is required for SlackInteractiveActions');
    }
    this.slackService = slackService;
  }

  /**
   * Sends course information to a specified Slack channel
   * 
   * This method retrieves course details and sends them as a formatted message
   * to the specified channel. It handles bot availability checks and provides
   * fallback behavior when no bots are available.
   * 
   * @param {string} channel - The Slack channel ID where the message should be sent
   * @returns {Promise<void>} A promise that resolves when the message is sent
   * @throws {Error} Logs error if message sending fails
   * 
   * @example
   * ```typescript
   * await interactiveActions.sendCourseInfo('C1234567890');
   * ```
   */
  public async sendCourseInfo(channel: string): Promise<void> {
    const botManager = this.slackService.getBotManager();
    if (!botManager) {
      debug('No bot manager available for sending course info');
      return;
    }
    
    const bots = botManager.getAllBots();
    if (bots.length === 0) {
      debug('No bots available for sending course info');
      return;
    }
    
    const botInfo = bots[0];
    try {
      await this.slackService.sendMessageToChannel(
        channel, 
        'Course Info: Here are the details...', 
        botInfo.botUserName || 'Jeeves',
      );
      debug(`Course info sent to channel: ${channel}`);
    } catch (error) {
      debug(`Failed to send course info: ${error}`);
      throw error;
    }
  }

  /**
   * Sends office hours booking instructions to a specified Slack channel
   * 
   * Provides users with step-by-step instructions on how to book office hours
   * with instructors or teaching assistants through the bot interface.
   * 
   * @param {string} channel - The Slack channel ID where instructions should be sent
   * @returns {Promise<void>} A promise that resolves when the message is sent
   * @throws {Error} Logs error if message sending fails
   * 
   * @example
   * ```typescript
   * await interactiveActions.sendBookingInstructions('C1234567890');
   * ```
   */
  public async sendBookingInstructions(channel: string): Promise<void> {
    const botManager = this.slackService.getBotManager();
    if (!botManager) {
      debug('No bot manager available for sending booking instructions');
      return;
    }
    
    const bots = botManager.getAllBots();
    if (bots.length === 0) {
      debug('No bots available for sending booking instructions');
      return;
    }
    
    const botInfo = bots[0];
    try {
      await this.slackService.sendMessageToChannel(
        channel, 
        'Office Hours Booking: To book office hours, use the /office-hours command followed by your preferred time slot. Available slots are Monday-Friday 2-4 PM.', 
        botInfo.botUserName || 'Jeeves',
      );
      debug(`Booking instructions sent to channel: ${channel}`);
    } catch (error) {
      debug(`Failed to send booking instructions: ${error}`);
      throw error;
    }
  }

  /**
   * Sends study resources and materials to a specified Slack channel
   * 
   * Provides users with curated study resources including documentation,
   * tutorials, practice exercises, and external learning materials relevant
   * to the course content.
   * 
   * @param {string} channel - The Slack channel ID where resources should be sent
   * @returns {Promise<void>} A promise that resolves when the message is sent
   * @throws {Error} Logs error if message sending fails
   * 
   * @example
   * ```typescript
   * await interactiveActions.sendStudyResources('C1234567890');
   * ```
   */
  public async sendStudyResources(channel: string): Promise<void> {
    const botManager = this.slackService.getBotManager();
    if (!botManager) {
      debug('No bot manager available for sending study resources');
      return;
    }
    
    const bots = botManager.getAllBots();
    if (bots.length === 0) {
      debug('No bots available for sending study resources');
      return;
    }
    
    const botInfo = bots[0];
    try {
      await this.slackService.sendMessageToChannel(
        channel, 
        'Study Resources: Here are some recommended resources to help with your learning journey...', 
        botInfo.botUserName || 'Jeeves',
      );
      debug(`Study resources sent to channel: ${channel}`);
    } catch (error) {
      debug(`Failed to send study resources: ${error}`);
      throw error;
    }
  }

  /**
   * Opens a modal dialog for users to ask questions
   * 
   * Creates and displays a Slack modal with a text input field where users
   * can type detailed questions. The modal includes proper validation and
   * follows Slack's interactive components guidelines.
   * 
   * @param {string} triggerId - The trigger ID from the Slack interaction payload
   * @returns {Promise<void>} A promise that resolves when the modal is opened
   * @throws {Error} Logs error if modal opening fails
   * 
   * @example
   * ```typescript
   * await interactiveActions.sendAskQuestionModal('12345.67890');
   * ```
   */
  public async sendAskQuestionModal(triggerId: string): Promise<void> {
    const botManager = this.slackService.getBotManager();
    if (!botManager) {
      debug('No bot manager available for opening modal');
      return;
    }
    
    const bots = botManager.getAllBots();
    if (bots.length === 0) {
      debug('No bots available for opening modal');
      return;
    }
    
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
      throw error;
    }
  }

  /**
   * Sends an interactive help message to guide users
   * 
   * Provides users with comprehensive guidance on how to interact with the bot,
   * including available commands, features, and best practices for getting help.
   * 
   * @param {string} channel - The Slack channel ID where help should be sent
   * @param {string} userId - The Slack user ID to mention in the help message
   * @returns {Promise<void>} A promise that resolves when the help message is sent
   * @throws {Error} Logs error if message sending fails
   * 
   * @example
   * ```typescript
   * await interactiveActions.sendInteractiveHelpMessage('C1234567890', 'U1234567890');
   * ```
   */
  public async sendInteractiveHelpMessage(channel: string, userId: string): Promise<void> {
    const botManager = this.slackService.getBotManager();
    if (!botManager) {
      debug('No bot manager available for sending help message');
      return;
    }
    
    const bots = botManager.getAllBots();
    if (bots.length === 0) {
      debug('No bots available for sending help message');
      return;
    }
    
    const botInfo = bots[0];
    try {
      await this.slackService.sendMessageToChannel(
        channel, 
        `Welcome <@${userId}>! Here's how to interact with me:\n\n` +
        '• Use `/ask` to ask a question\n' +
        '• Use `/office-hours` to book office hours\n' +
        '• Use `/resources` to get study materials\n' +
        '• Mention me in any message to get AI assistance',
        botInfo.botUserName || 'Jeeves',
      );
      debug(`Interactive help sent to channel: ${channel} for user: ${userId}`);
    } catch (error) {
      debug(`Failed to send interactive help: ${error}`);
      throw error;
    }
  }

  /**
   * Gets the underlying Slack service instance
   * 
   * Provides access to the SlackService instance for advanced operations
   * or when direct service access is needed.
   * 
   * @returns {SlackService} The SlackService instance
   * @deprecated This method is primarily for testing purposes
   * 
   * @example
   * ```typescript
   * const service = interactiveActions.getSlackService();
   * ```
   */
  private getSlackService(): SlackService {
    return this.slackService;
  }
}
