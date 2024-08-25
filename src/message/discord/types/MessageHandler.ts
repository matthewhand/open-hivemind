import { IMessage } from '@src/message/interfaces/IMessage';

export type MessageHandler = (processedMessage: IMessage, historyMessages: IMessage[]) => Promise<void>;
