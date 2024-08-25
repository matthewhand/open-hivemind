import { Message } from "discord.js";
export type MessageHandler = (processedMessage: Message, historyMessages: Message<boolean>[]) => Promise<void>;
