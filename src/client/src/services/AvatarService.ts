/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import type { AvatarService } from '../provider-configs/types';
import { apiService } from './api';
import Debug from 'debug';
const debug = Debug('app:client:services:AvatarService');

class ProviderAvatarService implements AvatarService {
  async loadAvatar(providerType: string, config: Record<string, any>): Promise<string | null> {
    try {
      switch (providerType) {
      case 'discord':
        return await this.loadDiscordAvatar(config);
      case 'slack':
        return await this.loadSlackAvatar(config);
      case 'telegram':
        return await this.loadTelegramAvatar(config);
      default:
        return null;
      }
    } catch (error) {
      debug('ERROR:', `Failed to load avatar for ${providerType}:`, error);
      return null;
    }
  }

  getSupportedProviders(): string[] {
    return ['discord', 'slack', 'telegram'];
  }

  private async loadDiscordAvatar(config: Record<string, any>): Promise<string | null> {
    const { botToken } = config;
    if (!botToken) {return null;}

    try {
      // In a real implementation, this would call your backend service
      // which would use the Discord API to get bot information
      const data = await apiService.post<any>('/api/providers/discord/avatar', { botToken });
      return data.avatarUrl;
    } catch (error) {
      debug('ERROR:', 'Failed to load Discord avatar:', error);
      return this.generateMockAvatar('discord', botToken);
    }
  }

  private async loadSlackAvatar(config: Record<string, any>): Promise<string | null> {
    const { botToken } = config;
    if (!botToken) {return null;}

    try {
      // In a real implementation, this would call your backend service
      // which would use the Slack API to get bot information
      const data = await apiService.post<any>('/api/providers/slack/avatar', { botToken });
      return data.avatarUrl;
    } catch (error) {
      debug('ERROR:', 'Failed to load Slack avatar:', error);
      return this.generateMockAvatar('slack', botToken);
    }
  }

  private async loadTelegramAvatar(config: Record<string, any>): Promise<string | null> {
    const { botToken } = config;
    if (!botToken) {return null;}

    try {
      // In a real implementation, this would call your backend service
      // which would use the Telegram Bot API to get bot information
      const data = await apiService.post<any>('/api/providers/telegram/avatar', { botToken });
      return data.avatarUrl;
    } catch (error) {
      debug('ERROR:', 'Failed to load Telegram avatar:', error);
      return this.generateMockAvatar('telegram', botToken);
    }
  }

  private generateMockAvatar(providerType: string, token: string): string {
    // Generate a deterministic avatar based on token for demo purposes
    const seed = token.substring(0, 8);
    const style = providerType === 'discord' ? 'robots' : providerType === 'slack' ? 'identicon' : 'bottts';

    // Using DiceBear API for avatars (free, no API key required)
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=${this.getProviderColor(providerType)}`;
  }

  private getProviderColor(providerType: string): string {
    const colors = {
      discord: '5865F2',
      slack: '4A154B',
      telegram: '0088CC',
    };
    return colors[providerType as keyof typeof colors] || '6B7280';
  }
}

export const avatarService = new ProviderAvatarService();