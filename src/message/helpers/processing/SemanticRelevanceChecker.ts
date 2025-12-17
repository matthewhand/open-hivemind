/**
 * SemanticRelevanceChecker - Uses a cheap 1-token LLM call to check if a message is on-topic
 * 
 * When enabled and the bot has posted recently, this provides a huge bonus to reply probability
 * if the incoming message is semantically relevant to the ongoing conversation.
 */

import Debug from 'debug';
import { getLlmProvider } from '@llm/getLlmProvider';
import messageConfig from '../../../config/messageConfig';

const debug = Debug('app:SemanticRelevanceChecker');

// Extensive list of affirmative responses to accept
const AFFIRMATIVES = new Set([
    'y', 'yes', 'yeah', 'yep', 'yup',
    'sure', 'ok', 'okay', 'aye', 'yea',
    'true', '1', 'si', 'oui',
    'correct', 'affirmative', 'absolutely',
    'indeed', 'definitely', 'certainly', 'right',
    'positive', 'roger', 'uh-huh', 'yah',
    'totally', 'exactly', 'precisely'
]);

/**
 * Check if a response is affirmative
 */
export function isAffirmative(response: string): boolean {
    const cleaned = response.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return AFFIRMATIVES.has(cleaned);
}

/**
 * Check if the incoming message is semantically relevant to the conversation
 * 
 * @param conversationContext - Recent messages for context (2-5 lines recommended)
 * @param newMessage - The incoming message to check
 * @returns true if on-topic, false otherwise
 */
export async function isOnTopic(
    conversationContext: string,
    newMessage: string
): Promise<boolean> {
    const enabled = Boolean(messageConfig.get('MESSAGE_SEMANTIC_RELEVANCE_ENABLED'));
    if (!enabled) {
        debug('Semantic relevance check is disabled');
        return false;
    }

    try {
        const providers = getLlmProvider();
        if (!providers || providers.length === 0) {
            debug('No LLM provider available for semantic check');
            return false;
        }

        const provider = providers[0];

        const prompt = `Given this conversation:\n${conversationContext}\n\nIs this new message on topic or relevant to the conversation?\n"${newMessage}"\n\nAnswer with just one word: Yes or No`;

        const response = await provider.generateChatCompletion([
            { role: 'system', content: 'You are a relevance checker. Answer only with Yes or No.' },
            { role: 'user', content: prompt }
        ], { maxTokens: 1, temperature: 0 });

        const answer = typeof response === 'string' ? response : response?.content || '';
        const result = isAffirmative(answer);

        debug(`Semantic relevance check: "${newMessage.substring(0, 30)}..." → ${result ? 'ON-TOPIC' : 'OFF-TOPIC'} (raw: "${answer}")`);
        console.info(`🎯 SEMANTIC | ${result ? '✅ on-topic' : '❌ off-topic'} | response: "${answer.trim()}"`);

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
    AFFIRMATIVES
};
