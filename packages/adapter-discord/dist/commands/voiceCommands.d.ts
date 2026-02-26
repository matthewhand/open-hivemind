import { SlashCommandBuilder } from '@discordjs/builders';
export declare const joinVoiceCommand: SlashCommandBuilder;
export declare const leaveVoiceCommand: SlashCommandBuilder;
export declare const listenCommand: SlashCommandBuilder;
export declare function handleJoinVoice(interaction: any): Promise<void>;
export declare function handleLeaveVoice(interaction: any): Promise<void>;
export declare function handleStartListening(interaction: any): Promise<void>;
//# sourceMappingURL=voiceCommands.d.ts.map