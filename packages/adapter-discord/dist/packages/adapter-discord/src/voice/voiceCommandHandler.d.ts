import type { VoiceConnection } from '@discordjs/voice';
export declare class VoiceCommandHandler {
    private connection;
    private isListening;
    constructor(connection: VoiceConnection);
    processVoiceInput(opusBuffer: Buffer): Promise<void>;
    private generateResponse;
    private speakResponse;
    startListening(): void;
    stopListening(): void;
}
//# sourceMappingURL=voiceCommandHandler.d.ts.map