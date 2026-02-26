import type { Client } from 'discord.js';
/**
 * Logs in the Discord client using the provided bot token.
 *
 * @param client - The Discord client instance to log in.
 * @param token - The Discord bot token.
 * @returns A promise that resolves when the login is successful.
 * @throws Will throw an error if the token is not provided or login fails.
 */
export declare function loginToDiscord(client: Client, token: string): Promise<string>;
//# sourceMappingURL=loginToDiscord.d.ts.map