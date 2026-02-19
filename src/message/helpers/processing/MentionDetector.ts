import Debug from 'debug';
import { IMessage } from '@message/interfaces/IMessage';

const debug = Debug('app:MentionDetector');

export interface MentionContext {
    isMentioningBot: boolean;
    isBotNameInText: boolean;
    isReplyToBot: boolean;
    mentionedUsernames: string[];
    isReplyToOther: boolean;
    replyToUsername?: string;
    contextHint: string; // Ready-to-use hint for system prompt
}

const DEFAULT_CONTEXT_HINT =
    '[CONTEXT: You were not specifically mentioned or replied to. If you respond, do so generally to the topic/room (do not assume the message is directed at you). Infer intent from recent conversation history; if still unclear, ask one brief clarifying question.]';

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeForNameMatch(input: string): string {
  const s = String(input || '');
  // Normalize common unicode punctuation that appears in chat clients.
  // This helps match "seneca’s" / "seneca—" / quoted variants reliably.
  return s
    .normalize('NFKC')
    .replace(/[\u2018\u2019\u2032]/g, '\'')
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isBotNameInText(text: string, botName: string): boolean {
  const t = normalizeForNameMatch(text || '');
  const name = normalizeForNameMatch(botName || '');
  if (!t || !name) {return false;}
  const namePattern = escapeRegExp(name).replace(/\s+/g, '\\s+');
  // Boundary chars include common punctuation and both ASCII and normalized unicode quotes/dashes.
  const re = new RegExp(`(^|[\\s"'\\(\\[\\{*])${namePattern}([\\s"'\\)\\]\\}*:,.!?\\-]|$)`, 'i');
  return re.test(t);
}

/**
 * Detect mentions and replies in a message to provide context hints to the LLM
 */
export function detectMentions(
  message: any, // Using any for flexible message interface
  botId: string,
  botUsername?: string,
): MentionContext {
  const text = (message.getText?.() || message.content || '') as string;
  const botName = (botUsername || '').trim();

  // Heuristic: bot name appears in text (not necessarily a platform mention).
  // Useful for "BotName: ..." or "hey BotName, ..." style addressing.
  const botNameDetected = isBotNameInText(text, botName);

  // Check if message is mentioning the bot
  const isMentioningBot =
        (typeof message.mentionsUsers === 'function' && message.mentionsUsers(botId)) ||
        (typeof message.isMentioning === 'function' && message.isMentioning(botId)) ||
        (typeof message.getUserMentions === 'function' && (message.getUserMentions() || []).includes(botId)) ||
        (botName && text.toLowerCase().includes(`@${botName.toLowerCase()}`)) ||
        botNameDetected;

  // Check if message is a reply
  const isReply =
        (typeof message.isReply === 'function' && message.isReply()) ||
        Boolean((message as any)?.data?.reference?.messageId);

  // Extract mentioned usernames from message (@username patterns)
  const mentionPattern = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionPattern.exec(text)) !== null) {
    const u = match[1];
    if (!u) {continue;}
    if (botName && u.toLowerCase() === botName.toLowerCase()) {continue;}
    mentions.push(u);
  }

  // Try to get reply target info if available
  let replyToUsername: string | undefined;
  let isReplyToBot = false;
  let isReplyToOther = false;

  if (isReply) {
    // Prefer explicit helper if provided by the message wrapper.
    if (typeof message.isReplyToBot === 'function' && message.isReplyToBot()) {
      isReplyToBot = true;
    } else {
      // Check if reply is to this bot (via metadata if available)
      const replyMetadata = (message as any).metadata?.replyTo;
      if (replyMetadata) {
        replyToUsername = replyMetadata.username;
        isReplyToBot = replyMetadata.userId === botId ||
                    (botUsername && replyMetadata.username === botUsername);
        isReplyToOther = !isReplyToBot;
      }
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
  if (!contextHint) {
    contextHint = DEFAULT_CONTEXT_HINT;
  }

  debug(`Mention detection: mentioningBot=${isMentioningBot}, replyToBot=${isReplyToBot}, mentions=${mentions.join(',')}, hint="${contextHint}"`);

  return {
    isMentioningBot,
    isBotNameInText: botNameDetected,
    isReplyToBot,
    mentionedUsernames: mentions,
    isReplyToOther,
    replyToUsername,
    contextHint,
  };
}
