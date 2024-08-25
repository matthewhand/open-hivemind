import { IMessage } from '@src/types/IMessage';

export type MessageHandler = (processedMessage: IMessage, historyMessages: IMessage[]) => Promise<void>;
