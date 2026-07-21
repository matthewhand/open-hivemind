import Debug from 'debug';
import { DatabaseManager } from '../../../database/DatabaseManager';
import { evaluateReplyDecision } from './shouldReply/evaluateReplyDecision';
import type {
  HistoryMessageLike,
  MessageLike,
  ReplyDecision,
  ShouldReplyOptions,
} from './shouldReply/types';

export type { ReplyDecision, ShouldReplyOptions } from './shouldReply/types';

const debug = Debug('app:shouldReplyToMessage');

export async function shouldReplyToMessage(
  message: MessageLike,
  botId: string,
  platform: 'discord' | 'generic',
  botNameOrNames?: string | string[],
  historyMessages?: HistoryMessageLike[],
  defaultChannelId?: string,
  botConfig?: Record<string, unknown>,
  options?: ShouldReplyOptions
): Promise<ReplyDecision> {
  const result = await evaluateReplyDecision(
    message,
    botId,
    platform,
    botNameOrNames,
    historyMessages,
    defaultChannelId,
    botConfig,
    options
  );

  // Extract bot name for persistence
  const namesRaw = Array.isArray(botNameOrNames)
    ? botNameOrNames
    : [botNameOrNames].filter(Boolean);
  const botName = namesRaw[0] || 'Unknown';

  // Extract roll and threshold from meta if they exist (from probability logic)
  let roll = 0.0;
  let threshold = 1.0;

  if (result.meta?.rolled !== undefined) {
    roll = Number(result.meta.rolled);
  }
  if (result.meta?.probability !== undefined) {
    const probStr = String(result.meta.probability);
    threshold = parseFloat(probStr.replace(/[<>]/g, '')) || 0.0;
  } else if (!result.shouldReply) {
    // For early exits that reject, threshold is 0
    threshold = 0.0;
    roll = 1.0;
  }

  // Persist to database
  try {
    const db = DatabaseManager.getInstance();
    if (db.isConfigured() && db.isConnected()) {
      await db.saveDecision({
        botName,
        shouldReply: result.shouldReply,
        reason: result.reason,
        probabilityRoll: roll,
        threshold,
      });
    }
  } catch (err) {
    debug('Error persisting decision:', err);
  }

  return result;
}
