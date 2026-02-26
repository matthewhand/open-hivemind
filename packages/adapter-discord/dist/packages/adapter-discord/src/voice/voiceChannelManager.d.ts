import type { VoiceConnection } from '@discordjs/voice';
import type { Client } from 'discord.js';
import { VoiceCommandHandler } from './voiceCommandHandler';
import { VoiceActivityDetection } from './voiceActivityDetection';
export declare class VoiceChannelManager {
    private connections;
    private handlers;
    private vadSystems;
    private client;
    constructor(client: Client);
    joinChannel(channelId: string, autoListen?: boolean): Promise<VoiceConnection>;
    leaveChannel(channelId: string): void;
    leaveAllChannels(): void;
    private cleanup;
    getConnection(channelId: string): VoiceConnection | undefined;
    getHandler(channelId: string): VoiceCommandHandler | undefined;
    getVAD(channelId: string): VoiceActivityDetection | undefined;
    getActiveChannels(): string[];
}
//# sourceMappingURL=voiceChannelManager.d.ts.map