import Debug from 'debug';
import slackConfig from '@src/config/slackConfig';
import { markdownToBlocks } from '@tryfabric/mack';
import { KnownBlock } from '@slack/web-api';
import { SlackBotManager } from './SlackBotManager';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import messageConfig from '@src/config/messageConfig';
import { ValidationError } from '@src/types/errorClasses';

const debug = Debug('app:SlackWelcomeHandler');

/**
 * Handles welcome messages and interactive responses for Slack channels.
 * Provides functionality for sending bot welcome messages, user welcome messages,
 * processing interactive button clicks, and managing channel joins.
 *
 * @class SlackWelcomeHandler
 */
export class SlackWelcomeHandler {
  private botManager: SlackBotManager;

  /**
   * Creates an instance of SlackWelcomeHandler.
   * @param {SlackBotManager} botManager - The SlackBotManager instance for managing bot operations
   * @throws {Error} Throws an error if botManager is not provided
   */
  constructor(botManager: SlackBotManager) {
    if (!botManager) {
      debug('Error: SlackBotManager instance required');
      throw new ValidationError('SlackBotManager instance required', 'SLACK_BOT_MANAGER_REQUIRED');
    }
    this.botManager = botManager;
    debug('SlackWelcomeHandler initialized');
  }

  /**
   * Sends a welcome message from the bot to a specified channel.
   * Generates a thought-provoking quote about the channel using LLM and posts it.
   * 
   * @param {string} channel - The Slack channel ID to send the welcome message to
   * @returns {Promise<void>} A promise that resolves when the message is sent
   * @throws {Error} Throws an error if channel is not provided or if message sending fails
   */
  public async sendBotWelcomeMessage(channel: string): Promise<void> {
    debug('Entering sendBotWelcomeMessage', { channel });
    if (!channel) {
      debug('Error: Channel ID required');
      throw new ValidationError('Channel ID required', 'SLACK_CHANNEL_ID_REQUIRED');
    }

    const botInfo = this.botManager.getAllBots()[0];
    let channelName = channel;
    try {
      const info = await botInfo.webClient.conversations.info({ channel });
      channelName = info.channel?.name || channel;
    } catch (error) {
      debug(`Failed to fetch channel name for ${channel}: ${error}`);
    }

    debug(`Generating welcome message for channel ${channelName}`);
    const llmProvider = getLlmProvider()[0];
    if (!llmProvider) {
      debug('Warning: No LLM provider available, using fallback quote');
    }
    const prompt = `Provide a thought-provoking, made-up quote about the dynamics of Slack channel #${channelName}. Do not include user-specific greetings or placeholders like slackUser.userName. Use plain quotation marks (") around the quote, not encoded forms like " or any HTML entities—just focus on the channel itself.`;
    let llmText = '';
    try {
      llmText = await llmProvider.generateChatCompletion(prompt, [], {});
      debug(`Raw LLM text: ${llmText}`);
      // Clean up any encoded quotes
      llmText = llmText
        .replace(/"/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"');
    } catch (error) {
      debug(`Failed to generate LLM quote: ${error}`);
      llmText = "Welcome to the channel! (No quote available)";
    }

    const attributions = ["ChatGPT", "Claude", "Gemini"];
    const chosenAttribution = attributions[Math.floor(Math.random() * attributions.length)];
    const welcomeText = `*Welcome to #${channelName}*\n\n${llmText.trim() || '"Writing is fun and easy"'}\n\n— ${chosenAttribution}`;
    const textBlock: KnownBlock = {
      type: 'section',
      text: { type: 'mrkdwn', text: welcomeText, verbatim: true }
    };

    try {
      const sentTs = await this.sendMessageToChannel(channel, welcomeText, undefined, undefined, [textBlock]);
      debug(`Sent bot welcome message to channel ${channel}, ts=${sentTs}`);
    } catch (error) {
      debug(`Failed to send bot welcome message to channel ${channel}: ${error}`);
      throw error;
    }
  }

  /**
   * Sends a welcome message for a new user joining a channel.
   * Processes markdown content and creates interactive buttons for user actions.
   * 
   * @param {string} channel - The Slack channel ID where the user joined
   * @param {string} userName - The username of the new user
   * @returns {Promise<void>} A promise that resolves when the welcome message is sent
   * @throws {Error} Throws an error if channel or userName is not provided, or if message sending fails
   */
  public async sendUserWelcomeMessage(channel: string, userName: string): Promise<void> {
    debug('Entering sendUserWelcomeMessage', { channel, userName });
    if (!channel || !userName) {
      debug('Error: Channel and userName required', { channel, userName });
      throw new Error('Channel and userName required');
    }

    const botInfo = this.botManager.getAllBots()[0];
    let channelName = channel;
    try {
      const info = await botInfo.webClient.conversations.info({ channel });
      channelName = info.channel?.name || channel;
    } catch (error) {
      debug(`Failed to fetch channel name for ${channel}: ${error}`);
    }

    const resourceUrl = process.env.RESOURCE_URL || 'https://university.example.com/resources';
    const defaultMessage = `# Welcome, ${userName}, to the #${channelName} channel! :wave:\n\n## Purpose\nThis channel is designed to help you achieve your learning objectives through interactive discussions and AI-powered assistance.\n\n## How to Use\n- **Ask Questions**: Post your questions here and I'll respond in threads to keep discussions organized\n- **Get Help**: Request private assistance and I'll DM you directly\n- **Track Progress**: Ask for assessments to monitor your learning journey\n\n## Resources\n- [Learning Portal](${resourceUrl})\n- [Documentation](${resourceUrl}/docs)\n- [Support](${resourceUrl}/support)\n\n## Actions\n- [Learning Objectives](action:learn_objectives_${channel})\n- [How-To](action:how_to_${channel})\n- [Contact Support](action:contact_support_${channel})\n- [Report Issue](action:report_issue_${channel})`;
    
    const welcomeMessage = slackConfig.get('SLACK_USER_JOIN_CHANNEL_MESSAGE') || defaultMessage;
    const processedMessage = welcomeMessage
      .replace(/{user}/g, userName)
      .replace(/{channel}/g, channelName);

    try {
      const blocks = await this.processWelcomeMessage(processedMessage, channel);
      await this.sendMessageToChannel(channel, processedMessage, undefined, undefined, blocks);
      debug(`Sent user welcome message to #${channel} for ${userName}`);
    } catch (error) {
      debug(`Failed to send user welcome message: ${error}`);
      throw new Error(`Failed to send welcome message: ${error}`);
    }
  }

  /**
   * Processes markdown content into Slack block format.
   * Converts markdown text into structured blocks with support for interactive buttons.
   * 
   * @param {string} markdown - The markdown content to process
   * @param {string} channel - The channel context for button actions
   * @returns {Promise<KnownBlock[]>} A promise that resolves to an array of Slack blocks
   * @throws {Error} Throws an error if markdown or channel is not provided
   */
  public async processWelcomeMessage(markdown: string, channel: string): Promise<KnownBlock[]> {
    debug('Entering processWelcomeMessage', { channel, markdown: markdown.substring(0, 50) + '...' });
    if (!markdown || !channel) {
      debug('Error: Markdown and channel required');
      throw new Error('Markdown and channel required');
    }

    const [content, buttonsPart] = markdown.split('\n## Actions\n');
    let blocks: KnownBlock[] = [];
    
    if (content) {
      try {
        const contentBlocks = await markdownToBlocks(content, {
          lists: { checkboxPrefix: (checked: boolean) => checked ? ':white_check_mark: ' : ':ballot_box_with_check: ' }
        });
        blocks = blocks.concat(contentBlocks.filter(b => b.type !== 'actions' && b.type !== 'section' && !('elements' in b)));
        debug(`Processed ${contentBlocks.length} content blocks`);
      } catch (error) {
        debug(`Error processing content blocks: ${error}`);
      }
    }

    if (buttonsPart) {
      const buttonLines = buttonsPart.trim().split('\n').filter(line => line.trim().startsWith('- ['));
      const actionsBlock: KnownBlock = { type: 'actions', elements: [] };
      
      for (const line of buttonLines) {
        const actionMatch = line.match(/-\s*\[([^\]]+)\]\(action:([^)]+)\)/);
        if (actionMatch) {
          const [, buttonText, actionId] = actionMatch;
          actionsBlock.elements.push({
            type: 'button',
            text: { type: 'plain_text', text: buttonText },
            action_id: actionId
          });
        }
      }
      
      if (actionsBlock.elements.length > 0) {
        blocks.push(actionsBlock);
      }
    }

    debug(`Processed ${blocks.length} total blocks`);
    return blocks;
  }

  /**
   * Handles button click interactions from Slack messages.
   * Processes the action ID and sends appropriate responses based on predefined mappings.
   * 
   * @param {string} channel - The channel where the button was clicked
   * @param {string} userId - The user ID who clicked the button
   * @param {string} actionId - The action identifier from the button
   * @returns {Promise<void>} A promise that resolves when the response is sent
   * @throws {Error} Throws an error if any required parameter is missing
   */
  public async handleButtonClick(channel: string, userId: string, actionId: string): Promise<void> {
    debug('Entering handleButtonClick', { channel, userId, actionId });
    if (!channel || !userId || !actionId) {
      debug('Error: Missing required parameters', { channel, userId, actionId });
      throw new Error('Channel, userId, and actionId required');
    }

    const reportIssueUrl = process.env.REPORT_ISSUE_URL || 'https://university.example.com/report-issue';
    const learnMoreDefault = `Here's more info about this channel!`;
    const learnMoreMessage = slackConfig.get('SLACK_BOT_LEARN_MORE_MESSAGE') || learnMoreDefault;
    const buttonMappingsRaw = process.env.SLACK_BUTTON_MAPPINGS || slackConfig.get('SLACK_BUTTON_MAPPINGS') || '{}';
    
    let buttonMappings: { [key: string]: string };
    try {
      buttonMappings = JSON.parse(buttonMappingsRaw);
      debug(`Button mappings: ${JSON.stringify(buttonMappings)}`);
    } catch (error) {
      debug(`Failed to parse SLACK_BUTTON_MAPPINGS: ${error}`);
      buttonMappings = {};
    }

    const buttonResponses: { [key: string]: string } = {
      [`learn_objectives_${channel}`]: `I'm here to help with learning objectives! Ask me anything in this channel, and I'll respond in a thread to keep things organized. For private assessments, I'll DM you directly.`,
      [`how_to_${channel}`]: `Here's how I work:\n- Ask questions in the channel, and I'll reply in threads for learning discussions.\n- For assessments or private help, I'll message you via DMs.\nTry asking "What are the learning objectives?" or "Assess my progress"!`,
      [`contact_support_${channel}`]: `Need support? Post your question here, and I'll thread it for group discussion. For private issues, I'll reach out via DM. You can also email support@university.example.com.`,
      [`report_issue_${channel}`]: `Something not working? Let me know here, and I'll thread it for help. Or report it directly at: ${reportIssueUrl}`
    };

    let responseText: string;
    if (actionId.startsWith('learn_more_')) {
      responseText = learnMoreMessage.replace('{channel}', channel);
    } else {
      responseText = buttonMappings[actionId] || buttonResponses[actionId] || 'Unknown action';
    }

    if (responseText === 'Unknown action') {
      debug(`Unknown action ID ${actionId}`);
      await this.sendMessageToChannel(channel, `Sorry, I don't recognize that action. Try one of the welcome buttons!`, undefined);
    } else {
      await this.sendMessageToChannel(channel, responseText, undefined);
      debug(`Sent button response in #${channel} for action ${actionId}: ${responseText.substring(0, 50)}...`);
    }
  }

  /**
   * Joins configured channels for a bot and sends welcome messages.
   * Processes the SLACK_JOIN_CHANNELS configuration and attempts to join each channel.
   * 
   * @param {any} botInfo - The bot information object containing webClient and bot details
   * @returns {Promise<void>} A promise that resolves when all channels are processed
   */
  public async joinConfiguredChannelsForBot(botInfo: any): Promise<void> {
    debug('Entering joinConfiguredChannelsForBot', { botUserId: botInfo.botUserId });
    const channelsConfig = slackConfig.get('SLACK_JOIN_CHANNELS') || '';
    const channelList = channelsConfig.split(',').map(c => c.trim()).filter(Boolean);
    
    debug(`Joining ${channelList.length} channels: ${channelList.join(', ')}`);
    
    for (const channel of channelList) {
      try {
        await botInfo.webClient.conversations.join({ channel });
        debug(`Joined #${channel} for ${botInfo.botUserId}`);
        await this.sendBotWelcomeMessage(channel);
      } catch (error) {
        debug(`Failed to join #${channel} or already present: ${error}`);
        await this.sendBotWelcomeMessage(channel);
      }
    }
  }

  /**
   * Sends a message to a specific channel using the bot's web client.
   * Handles text formatting, username display, and thread support.
   * 
   * @private
   * @param {string} channelId - The Slack channel ID to send the message to
   * @param {string} text - The message text to send
   * @param {string} [senderName] - Optional custom sender name for the bot
   * @param {string} [threadId] - Optional thread ID to reply in a thread
   * @param {KnownBlock[]} [blocks] - Optional Slack blocks for rich formatting
   * @returns {Promise<string>} A promise that resolves to the message timestamp
   * @throws {Error} Throws an error if message sending fails
   */
  private async sendMessageToChannel(
    channelId: string,
    text: string,
    senderName?: string,
    threadId?: string,
    blocks?: KnownBlock[]
  ): Promise<string> {
    debug('Entering sendMessageToChannel (internal)', { 
      channelId, 
      text: text.substring(0, 50) + '...', 
      senderName, 
      threadId 
    });

    // Clean up any HTML entities in the text
    const decodedText = text
      .replace(/"/g, '"')
      .replace(/&#34;/g, '"')
      .replace(/'/g, "'")
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>');

    const displayName = senderName || messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
    const botInfo = this.botManager.getBotByName(displayName) || this.botManager.getAllBots()[0];

    if (!botInfo) {
      debug('Error: No bot available to send message');
      return '';
    }

    try {
      const options: any = {
        channel: channelId,
        text: decodedText || (blocks?.length ? 'Message with interactive content' : 'No content provided'),
        username: displayName,
        icon_emoji: ':robot_face:',
        unfurl_links: true,
        unfurl_media: true,
        parse: 'none'
      };

      if (threadId) {
        options.thread_ts = threadId;
      }

      if (blocks?.length) {
        options.blocks = blocks.map(block => {
          if (block.type === 'section' && block.text?.type === 'mrkdwn') {
            return { ...block, text: { ...block.text, verbatim: true } };
          }
          return block;
        });
      }

      debug(`Final text to post: ${options.text.substring(0, 50)}${options.text.length > 50 ? '...' : ''}`);
      const result = await botInfo.webClient.chat.postMessage(options);
      debug(`Sent message to #${channelId}${threadId ? ` thread ${threadId}` : ''}, ts=${result.ts}`);
      return result.ts || '';
    } catch (error) {
      debug(`Failed to send message: ${error}`);
      return '';
    }
  }
}