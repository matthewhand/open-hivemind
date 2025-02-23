import debugModule from 'debug';
import { getLLMProvider } from '@llm/management/getLLMProvider';
import { IMessage } from '@message/interfaces/IMessage';
import { IMessengerService } from '@message/interfaces/IMessengerService';

const debug = debugModule('app:messageHandler');
const llmProviders = getLLMProvider();

async function handleMessage(
  message: IMessage,
  historyMessages: IMessage[],
  messengerService: IMessengerService
): Promise<string> {
  debug(`Handling message: ${message.getText()}`);
  
  // Ignore bot messages (redundant with DiscordService check, but added for safety)
  if (message.isFromBot()) return '';

  const llm = llmProviders[0]; // Use first LLM
  const response = await llm.generate(message.getText());
  
  // Send a single response
  const reply = `I'm here to help! Could you please provide more details about your query? For example, are you looking for course recommendations, campus events, or scheduling assistance?`;
  await messengerService.sendMessageToChannel(message.getChannelId(), reply);
  
  return reply;
}

export { handleMessage };
