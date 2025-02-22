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
  const llm = llmProviders[0]; // Use first LLM for now
  const response = await llm.generate(message.getText());
  await messengerService.sendMessageToChannel(message.getChannelId(), response);
  return response;
}

export { handleMessage };
