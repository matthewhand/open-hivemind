import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { validateMessage } from '@src/message/helpers/processing/validateMessage';
import { processCommand } from '@src/message/helpers/processing/processCommand';
import { getMessageProvider } from '@src/message/management/getMessageProvider';
import { getLlmProvider } from '@src/message/management/getLlmProvider';
import messageConfig from '@src/message/interfaces/messageConfig';
import { listChatFlowsCommand } from '@integrations/flowise/commands/listChatFlowsCommand';

const debug = Debug('app:messageHandler');

export async function messageHandler(
  msg: IMessage,
  historyMessages: IMessage[] = []
): Promise<void> {
  const channelId = msg.getChannelId();
  const allowedInlineChannels = messageConfig.get('MESSAGE_INLINE_COMMAND_CHANNELS')?.split(',') || [];

  // Only process inline commands if the channel is allowed
  if (allowedInlineChannels.includes(channelId)) {
    const text = msg.getText().trim();

    if (text.startsWith('!flowise:listChatFlows')) {
      debug('Executing Flowise inline command: listChatFlows');
      const commandResult = await listChatFlowsCommand();
      await msg.reply(commandResult);
      return;
    }
    // Additional inline commands can be handled here...
  }

  // Proceed with LLM or slash command handling if no inline command is processed
  const messageProvider = getMessageProvider();
  let commandProcessed = false;

  await processCommand(msg, async (result: string) => {
    await messageProvider.sendMessageToChannel(channelId, result);
    commandProcessed = true;
  });

  if (!commandProcessed && messageConfig.get('MESSAGE_LLM_CHAT')) {
    const llmProvider = getLlmProvider(channelId);
    const llmResponse = await llmProvider(msg.getText(), historyMessages);
    await messageProvider.sendMessageToChannel(channelId, llmResponse);
  }
}
