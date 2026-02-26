export interface DiscordConnectionTestResult {
    ok: boolean;
    message: string;
    details?: Record<string, unknown>;
}
export declare const testDiscordConnection: (token: string) => Promise<DiscordConnectionTestResult>;
//# sourceMappingURL=DiscordConnectionTest.d.ts.map