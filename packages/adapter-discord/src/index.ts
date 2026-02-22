// export * from './interfaces/index'; // If used
// Export other public members if needed
import { Discord } from './DiscordService';

export * from './DiscordService';
export { default as DiscordMessage } from './DiscordMessage';
export { testDiscordConnection } from './DiscordConnectionTest';
export { DiscordMessageProvider } from './providers/DiscordMessageProvider';

export const DiscordService = Discord.DiscordService;
export default DiscordService;
