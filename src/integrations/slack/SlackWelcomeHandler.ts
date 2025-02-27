import Debug from 'debug';
import slackConfig from '@src/config/slackConfig';
import { markdownToBlocks } from '@tryfabric/mack';
import { KnownBlock } from '@slack/web-api';
import { SlackBotManager } from './SlackBotManager';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import messageConfig from '@src/config/messageConfig';

const debug = Debug('app:SlackWelcomeHandler');

export class SlackWelcomeHandler {
  private botManager: SlackBotManager;

  constructor(botManager: SlackBotManager) {
    if (!botManager) {
      debug('Error: SlackBotManager instance required');
      throw new Error('SlackBotManager instance required');
    }
    this.botManager = botManager;
    debug('SlackWelcomeHandler initialized');
  }

  public async sendBotWelcomeMessage(channel: string): Promise<void> {
    debug('Entering sendBotWelcomeMessage', { channel });
    if (!channel) {
      debug('Error: Channel ID required');
      throw new Error('Channel ID required');
    }

    const botInfo = this.botManager.getAllBots()[0];
    let channelName = channel;
    try {
      const info = await botInfo.webClient.conversations.info({ channel });
      channelName = info.channel?.name || channel;
      debug(`Resolved channel name: ${channelName}`);
    } catch (error) {
      debug(`Failed to fetch channel name for ${channel}: ${error}`);
    }

    debug(`Generating welcome message for channel ${channelName}`);
    const llmProvider = getLlmProvider()[0];
    if (!llmProvider) {
      debug('Warning: No LLM provider available, using fallback quote');
    }
    const prompt = `Provide a thought-provoking, made-up quote about the dynamics of Slack channel #${channelName}.`;
    let llmText = '';
    try {
      llmText = await llmProvider.generateChatCompletion(prompt, [], {});
      debug(`Generated LLM text: ${llmText}`);
    } catch (error) {
      debug(`Failed to generate LLM quote: ${error}`);
      llmText = "Welcome to the channel! (No quote available)";
    }

    const attributions = ["ChatGPT", "Claude", "Gemini"];
    const chosenAttribution = attributions[Math.floor(Math.random() * attributions.length)];
    const welcomeText = `*Welcome to #${channelName}*\n\n${llmText.trim() || '"Writing is fun and easy"'}\n\n— ${chosenAttribution}`;
    const textBlock: KnownBlock = {
      type: 'section',
      text: { type: 'mrkdwn', text: welcomeText }
    };

    try {
      const sentTs = await this.sendMessageToChannel(channel, welcomeText, undefined, undefined, [textBlock]);
      debug(`Sent bot welcome message to channel ${channel}, ts=${sentTs}`);
    } catch (error) {
      debug(`Failed to send bot welcome message to channel ${channel}: ${error}`);
      throw error;
    }
  }

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
      debug(`Resolved channel name: ${channelName}`);
    } catch (error) {
      debug(`Failed to fetch channel name for ${channel}: ${error}`);
    }

    const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
    const resourceUrl = process.env.WELCOME_RESOURCE_URL || 'https://university.example.com/resources';
    const markdownMessage = slackConfig.get('SLACK_USER_JOIN_CHANNEL_MESSAGE') || 
      `# Welcome, {user}, to the {channel} channel! :wave:\n\nHere’s some quick info:\n- *Purpose*: Support student inquiries related to learning objectives...\n- *Resources*: [Learn More](${resourceUrl})\n\n## Actions\n- [Learning Objectives](action:learn_objectives_{channel})\n- [How-To](action:how_to_{channel})\n- [Contact Support](action:contact_support_{channel})\n- [Report Issue](action:report_issue_{channel})`;
    const formattedMessage = markdownMessage
      .replace('{user}', userName)
      .replace(/{channel}/g, channelName);
    debug(`Formatted welcome message: ${formattedMessage.substring(0, 100)}...`);

    const blocks = await this.processWelcomeMessage(formattedMessage, channel);
    try {
      await botInfo.webClient.chat.postMessage({ channel, blocks });
      debug(`Sent user welcome message to #${channel} for ${userName}`);
    } catch (error) {
      debug(`Failed to send user welcome message: ${error}`);
      throw new Error(`Failed to send welcome message: ${error}`);
    }
  }

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
        const actionMatch = line.match(/-\s*\[([^\]]+)\]\(action:([^\)]+)\)/);
        if (actionMatch) {
          const buttonText = actionMatch[1];
          const actionId = actionMatch[2].replace('{channel}', channel);
          (actionsBlock.elements as any[]).push({
            type: 'button',
            text: { type: 'plain_text', text: buttonText },
            action_id: actionId,
            value: actionId,
            style: 'primary'
          });
          debug(`Added button: text=${buttonText}, actionId=${actionId}`);
        }
      }
      if (actionsBlock.elements.length > 0) {
        blocks.push(actionsBlock);
        debug(`Added actions block with ${actionsBlock.elements.length} buttons`);
      }
    }

    debug(`Processed ${blocks.length} total blocks`);
    return blocks;
  }

  public async handleButtonClick(channel: string, userId: string, actionId: string): Promise<void> {
    debug('Entering handleButtonClick', { channel, userId, actionId });
    if (!channel || !userId || !actionId) {
      debug('Error: Missing required parameters', { channel, userId, actionId });
      throw new Error('Channel, userId, and actionId required');
    }

    const reportIssueUrl = process.env.REPORT_ISSUE_URL || 'https://university.example.com/report-issue';
    const learnMoreDefault = `Here’s more info about this channel!`;
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
      [`learn_objectives_${channel}`]: `I’m here to help with learning objectives! Ask me anything in this channel, and I’ll respond in a thread to keep things organized. For private assessments, I’ll DM you directly.`,
      [`how_to_${channel}`]: `Here’s how I work:\n- Ask questions in the channel, and I’ll reply in threads for learning discussions.\n- For assessments or private help, I’ll message you via DMs.\nTry asking "What are the learning objectives?" or "Assess my progress"!`,
      [`contact_support_${channel}`]: `Need support? Post your question here, and I’ll thread it for group discussion. For private issues, I’ll reach out via DM. You can also email support@university.example.com.`,
      [`report_issue_${channel}`]: `Something not working? Let me know here, and I’ll thread it for help. Or report it directly at: ${reportIssueUrl}`
    };

    let responseText: string;
    if (actionId.startsWith('learn_more_')) {
      responseText = learnMoreMessage.replace('{channel}', channel);
    } else {
      responseText = buttonResponses[actionId] || buttonMappings[actionId] || 'Unknown action';
    }

    if (responseText === 'Unknown action') {
      debug(`Unknown action ID ${actionId}`);
      await this.sendMessageToChannel(channel, `Sorry, I don’t recognize that action. Try one of the welcome buttons!`, undefined);
    } else {
      await this.sendMessageToChannel(channel, responseText, undefined);
      debug(`Sent button response in #${channel} for action ${actionId}: ${responseText.substring(0, 50)}...`);
    }
  }

  public async joinConfiguredChannelsForBot(botInfo: any): Promise<void> {
    debug('Entering joinConfiguredChannelsForBot', { bot: botInfo.botUserName || botInfo.botToken.substring(0, 8) });
    const channels = slackConfig.get('SLACK_JOIN_CHANNELS');
    if (!channels) {
      debug('No channels configured to join');
      return;
    }

    const channelList = channels.split(',').map((ch: string) => ch.trim());
    debug(`Joining ${channelList.length} channels: ${channelList.join(', ')}`);
    for (const channel of channelList) {
      if (!channel) continue;
      try {
        debug(`Attempting to join channel ${channel}`);
        await botInfo.webClient.conversations.join({ channel });
        debug(`Joined #${channel} for ${botInfo.botUserId}`);
        await this.sendBotWelcomeMessage(channel);
      } catch (error) {
        debug(`Failed to join #${channel} or already present: ${error}`);
        await this.sendBotWelcomeMessage(channel);
      }
    }
  }

  private async sendMessageToChannel(channelId: string, text: string, senderName?: string, threadId?: string, blocks?: KnownBlock[]): Promise<string> {
    debug('Entering sendMessageToChannel (internal)', { channelId, text: text.substring(0, 50) + '...', senderName, threadId });
    const rawText = text;
    const decodedText = rawText
      .replace(/&#39;|'|'/g, "'")  // Catch numeric and named apostrophes
      .replace(/&#34;|'|"/g, '"')  // Catch numeric and named quotes
      .replace(/&#60;|<|</g, '<')    // Less-than
      .replace(/&#62;|>|>/g, '>')    // Greater-than
      .replace(/&#38;|&|&/g, '&');  // Ampersand
    debug(`Raw text: ${rawText.substring(0, 50) + (rawText.length > 50 ? '...' : '')}`);
    debug(`Decoded text: ${decodedText.substring(0, 50) + (decodedText.length > 50 ? '...' : '')}`);
    const displayName = senderName || messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
    const botInfo = this.botManager.getBotByName(displayName) || this.botManager.getAllBots()[0];

    try {
      const options: any = {
        channel: channelId,
        text: decodedText || (blocks?.length ? 'Message with interactive content' : 'No content provided'),
        username: displayName,
        icon_emoji: ':robot_face:',
        unfurl_links: true,
        unfurl_media: true,
        parse: 'none' // Force raw text rendering
      };
      if (threadId) options.thread_ts = threadId;
      if (blocks?.length) options.blocks = blocks;
      debug(`Final text to post: ${options.text.substring(0, 50) + (options.text.length > 50 ? '...' : '')}`);
      const result = await botInfo.webClient.chat.postMessage(options);
      debug(`Sent message to #${channelId}${threadId ? ` thread ${threadId}` : ''}, ts=${result.ts}`);
      return result.ts || '';
    } catch (error) {
      debug(`Failed to send message: ${error}`);
      return '';
    }
  }
}
