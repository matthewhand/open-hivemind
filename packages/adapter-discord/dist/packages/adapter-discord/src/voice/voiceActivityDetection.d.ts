import type { VoiceConnection } from '@discordjs/voice';
export declare class VoiceActivityDetection {
    private receiver;
    private activeUsers;
    constructor(connection: VoiceConnection);
    private setupListeners;
    isUserSpeaking(userId: string): boolean;
    getActiveSpeakers(): string[];
    onUserStartSpeaking(callback: (userId: string) => void): void;
    onUserStopSpeaking(callback: (userId: string) => void): void;
}
//# sourceMappingURL=voiceActivityDetection.d.ts.map