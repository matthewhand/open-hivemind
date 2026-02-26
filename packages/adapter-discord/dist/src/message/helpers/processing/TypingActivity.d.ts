/**
 * Tracks recent "typingStart" signals from other users in a channel.
 * Used to delay starting our own typing indicator to feel less interruptive.
 */
export declare class TypingActivity {
    private static instance;
    private byChannel;
    static getInstance(): TypingActivity;
    recordTyping(channelId: string, userId: string): void;
    getActiveTypistCount(channelId: string, windowMs: number): number;
    isOthersTyping(channelId: string, windowMs: number): boolean;
    clear(channelId?: string): void;
}
export default TypingActivity;
//# sourceMappingURL=TypingActivity.d.ts.map