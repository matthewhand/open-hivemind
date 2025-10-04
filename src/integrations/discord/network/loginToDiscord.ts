import Debug from 'debug';
import { Client } from 'discord.js';
import { HivemindError, ErrorUtils } from '@src/types/errors';

const debug = Debug('app:loginToDiscord');

/**
 * Logs in the Discord client using the provided bot token.
 * 
 * @param client - The Discord client instance to log in.
 * @param token - The Discord bot token.
 * @returns A promise that resolves when the login is successful.
 * @throws Will throw an error if the token is not provided or login fails.
 */
export async function loginToDiscord(client: Client, token: string): Promise<string> {
    debug('Attempting to log in to Discord.');
    // Guard clause: Ensure the token is provided.
    if (!token) {
        const errorMessage = 'DISCORD_BOT_TOKEN is not defined.';
        debug(errorMessage);
        throw ErrorUtils.createError(
            errorMessage,
            'ValidationError' as any,
            'DISCORD_TOKEN_NOT_PROVIDED',
            400
        );
    }
    try {
        const result = await client.login(token);
        debug('Successfully logged in to Discord.');
        return result;
    } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error);
        const classification = ErrorUtils.classifyError(hivemindError);

        const errorMessage = 'Failed to log in to Discord: ' + ErrorUtils.getMessage(hivemindError);
        debug(errorMessage);

        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('Discord login error:', hivemindError);
        }

        throw ErrorUtils.createError(
            errorMessage,
            classification.type,
            'DISCORD_LOGIN_ERROR',
            ErrorUtils.getStatusCode(hivemindError),
            { originalError: error }
        );
    }
}
