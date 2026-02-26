import type { VoiceConnection } from '@discordjs/voice';
export declare class AudioRecorder {
    private connection;
    private recordings;
    private isRecording;
    constructor(connection: VoiceConnection);
    startRecording(userId?: string): void;
    stopRecording(): Map<string, Buffer>;
    private recordUser;
    private recordAllUsers;
    saveRecording(userId: string, outputPath: string): Promise<string>;
    getRecordingDuration(userId: string): number;
}
//# sourceMappingURL=audioRecorder.d.ts.map