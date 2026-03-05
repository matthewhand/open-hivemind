/**
 * SemanticRelevanceChecker - Uses a cheap 1-token LLM call to check if a message is on-topic
 *
 * When enabled and the bot has posted recently, this provides a huge bonus to reply probability
 * if the incoming message is semantically relevant to the ongoing conversation.
 */

import Debug from 'debug';
import { getTaskLlm } from '@llm/taskLlmRouter';
import messageConfig from '../../../config/messageConfig';

const debug = Debug('app:SemanticRelevanceChecker');

// Extensive list of affirmative responses to accept
const AFFIRMATIVES = new Set([
  'y',
  'yes',
  'yeah',
  'yep',
  'yup',
  'sure',
  'ok',
  'okay',
  'aye',
  'yea',
  'true',
  '1',
  'si',
  'oui',
  'correct',
  'affirmative',
  'absolutely',
  'indeed',
  'definitely',
  'certainly',
  'right',
  'positive',
  'roger',
  'uh-huh',
  'yah',
  'totally',
  'exactly',
  'precisely',
]);

/**
 * Check if a response is affirmative
 */
export function isAffirmative(response: string): boolean {
  const cleaned = response
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return AFFIRMATIVES.has(cleaned);
}

/**
 * Check if the incoming message is semantically relevant to the conversation
 *
 * @param conversationContext - Recent messages for context (2-5 lines recommended)
 * @param newMessage - The incoming message to check
 * @returns true if on-topic, false otherwise
 */
export async function isOnTopic(conversationContext: string, newMessage: string): Promise<boolean> {
  const enabled = Boolean(messageConfig.get('MESSAGE_SEMANTIC_RELEVANCE_ENABLED'));
  if (!enabled) {
    debug('Semantic relevance check is disabled');
    return false;
  }

  try {
    const sel = await getTaskLlm('semantic', {
      baseMetadata: { maxTokensOverride: 5 },
    });

    if (!sel?.provider) {
      debug('Semantic relevance check: no LLM provider available, failing open');
      return true;
    }

    const { provider, metadata } = sel;

    // Build the prompt - focussing on pivoting vs continuation
    const prompt = `You are a conversation flow analyzer. Determine if the new message continues the current topic or pivots to a new, unrelated topic.\n\nContext:\n${conversationContext}\n\nNew Message:\n"${newMessage}"\n\nHas the topic pivoted? Answer with one word: "Pivoted" or "Continuing".`;

    // Use the correct interface: generateChatCompletion(userMessage, historyMessages, metadata)
    const response = await provider.generateChatCompletion(prompt, [], metadata);

    const answer = typeof response === 'string' ? response.toLowerCase() : '';

    // "Continuing" or "No" (has not pivoted) = On Topic
    const isOnTopic = answer.includes('continu') || answer.includes('no');

    // "Pivoted" or "Yes" (has pivoted) = Off Topic
    const isPivoted = answer.includes('pivot') || answer.includes('yes');

    // Logic: specific "continuing" signal is best, but if neither, assume off-topic (pivot) for strictness?
    // User wants pivoted = penalty. So result=true means "Good/Bonus" (Continuing).

    let result = false;
    if (isOnTopic) {
      result = true;
    } else if (isPivoted) {
      result = false;
    } else {
      result = false;
    } // Default failure case

    debug(
      `Semantic relevance check: "${newMessage.substring(0, 30)}..." → ${result ? 'CONTINUING' : 'PIVOTED'} (raw: "${answer}")`
    );

    return result;
  } catch (err) {
    debug('Semantic relevance check failed:', err);
    console.warn('🎯 SEMANTIC | check failed, assuming off-topic');
    return false; // Fail closed - don't boost if check fails
  }
}

/**
 * Get the semantic relevance bonus multiplier from config
 */
export function getSemanticBonus(): number {
  const bonus = messageConfig.get('MESSAGE_SEMANTIC_RELEVANCE_BONUS');
  return typeof bonus === 'number' ? bonus : Number(bonus) || 10;
}

export default {
  isOnTopic,
  isAffirmative,
  getSemanticBonus,
  AFFIRMATIVES,
};

/**
 * Check if the message is nonsense, corrupted, or largely repetitive/gibberish.
 *
 * @param message - The message text to analyze
 * @returns true if nonsense/corrupted, false if coherent
 */
export async function isNonsense(message: string): Promise<boolean> {
  // Skip short messages (e.g. "ok", "hi") - hard to judge as nonsense without context
  if (!message || message.length < 5) {
    return false;
  }

  const enabled = Boolean(messageConfig.get('MESSAGE_SEMANTIC_RELEVANCE_ENABLED'));
  // We reuse the semantic enabled flag or could add a specific one.
  // If semantic checks are off, likely this expensive check should be off too.
  if (!enabled) {
    return false;
  }

  try {
    const sel = await getTaskLlm('semantic', {
      baseMetadata: { maxTokensOverride: 5 },
    });

    if (!sel?.provider) {
      debug('Nonsense check: no LLM provider available, assuming coherent');
      return false;
    }

    const { provider, metadata } = sel;

    const prompt = `Analyze this message. Is it nonsense, corrupted text, a repetition loop, or does it cut off unexpectedly mid-sentence? Answer "Nonsense" or "Coherent".\n\nMessage: "${message}"`;
    const response = await provider.generateChatCompletion(prompt, [], metadata);
    const answer = typeof response === 'string' ? response.toLowerCase() : '';

    const isNonsense =
      answer.includes('nonsense') || answer.includes('corrupt') || answer.includes('loop');
    debug(
      `Nonsense check: "${message.substring(0, 30)}..." → ${isNonsense ? 'NONSENSE' : 'COHERENT'} (raw: "${answer}")`
    );

    return isNonsense;
  } catch (err) {
    debug('Nonsense check failed:', err);
    return false; // Fail safe
  }
}
