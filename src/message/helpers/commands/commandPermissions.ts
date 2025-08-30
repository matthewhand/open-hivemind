import Debug from 'debug';
import { IMessage } from '@message/interfaces/IMessage';

const debug = Debug('app:commandPermissions');

export interface PermissionConfig {
  adminUsers?: string[];
  allowedChannels?: string[];
  restrictedCommands?: string[];
}

export function checkCommandPermissions(
  message: IMessage,
  command: string,
  config: PermissionConfig = {}
): boolean {
  const { adminUsers = [], allowedChannels = [], restrictedCommands = [] } = config;
  
  // Check if command is restricted
  if (restrictedCommands.includes(command)) {
    debug(`Command ${command} is restricted`);
    return isAuthorizedUser(message.getAuthorId(), adminUsers);
  }
  
  // Check channel permissions
  if (allowedChannels.length > 0 && !allowedChannels.includes(message.getChannelId())) {
    debug(`Channel ${message.getChannelId()} not in allowed channels`);
    return false;
  }
  
  return true;
}

export function isAuthorizedUser(userId: string, adminUsers: string[] = []): boolean {
  return adminUsers.includes(userId);
}