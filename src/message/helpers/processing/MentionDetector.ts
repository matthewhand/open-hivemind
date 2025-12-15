import Debug from 'debug';
import { IMessage } from '@message/interfaces/IMessage';

const debug = Debug('app:MentionDetector');

export interface MentionContext {
    isMentioningBot: boolean;
    isReplyToBot: boolean;
    mentionedUsernames: string[];
    isReplyToOther: boolean;
    replyToUsername?: string;
    contextHint: string; // Ready-to-use hint for system prompt
}

/**
 * Detect mentions and replies in a message to provide context hints to the LLM
 */
export function detectMentions(
    message: any, // Using any for flexible message interface
    botId: string,
    botUsername?: string
): MentionContext {
    const text = (message.getText?.() || message.content || '') as string;

    // Check if message is mentioning the bot
    const isMentioningBot = (typeof message.isMentioning === 'function' && message.isMentioning(botId)) ||
        (botUsername && text.toLowerCase().includes(`@${botUsername.toLowerCase()}`));

    // Check if message is a reply
    const isReply = typeof message.isReply === 'function' ? message.isReply() : false;

    // Extract mentioned usernames from message (@username patterns)
    const mentionPattern = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionPattern.exec(text)) !== null) {
        if (match[1] !== botUsername) {
            mentions.push(match[1]);
        }
    }

    // Try to get reply target info if available
    let replyToUsername: string | undefined;
    let isReplyToBot = false;
    let isReplyToOther = false;

    if (isReply) {
        // Check if reply is to this bot (via metadata if available)
        const replyMetadata = (message as any).metadata?.replyTo;
        if (replyMetadata) {
            replyToUsername = replyMetadata.username;
            isReplyToBot = replyMetadata.userId === botId ||
                (botUsername && replyMetadata.username === botUsername);
            isReplyToOther = !isReplyToBot;
        }
    }

    // Build context hint for system prompt
    let contextHint = '';

    if (isMentioningBot || isReplyToBot) {
        contextHint = '[CONTEXT: You are being directly addressed/mentioned. Respond directly to the user.]';
    } else if (isReplyToOther && replyToUsername) {
        contextHint = `[CONTEXT: The user is replying to a message from ${replyToUsername}. You are observing this conversation.]`;
    } else if (mentions.length > 0) {
        contextHint = `[CONTEXT: The user is addressing ${mentions.join(', ')}. You are observing unless you have something relevant to add.]`;
    }

    debug(`Mention detection: mentioningBot=${isMentioningBot}, replyToBot=${isReplyToBot}, mentions=${mentions.join(',')}, hint="${contextHint}"`);

    return {
        isMentioningBot,
        isReplyToBot,
        mentionedUsernames: mentions,
        isReplyToOther,
        replyToUsername,
        contextHint
    };
}
