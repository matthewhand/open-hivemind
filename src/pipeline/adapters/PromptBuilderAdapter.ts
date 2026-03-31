/**
 * Adapter that wraps the system prompt building logic as a pipeline
 * {@link PromptBuilder}.
 *
 * Mirrors the approach used in `messageHandler.ts`:
 *  1. Build a base system prompt with the bot's name injected.
 *  2. Append any retrieved memories as a formatted block.
 *
 * @module pipeline/adapters/PromptBuilderAdapter
 */

import type { PromptBuilder } from '@src/pipeline/EnrichStage';

/**
 * Adapts the existing system prompt construction logic into the
 * pipeline's {@link PromptBuilder} interface.
 *
 * This adapter is stateless — no external dependencies are required.
 */
export class PromptBuilderAdapter implements PromptBuilder {
  buildSystemPrompt(
    botConfig: Record<string, unknown>,
    memories: string[],
    botName: string,
  ): string {
    // 1. Construct the base system prompt (same logic as messageHandler's
    //    buildSystemPromptWithBotName).
    const baseRaw = botConfig.MESSAGE_SYSTEM_PROMPT;
    const base = typeof baseRaw === 'string' ? baseRaw.trim() : '';
    const name = String(botName || '').trim();

    const hint = name
      ? `You are ${name}. Your display name in chat is "${name}".`
      : 'You are an assistant operating inside a multi-user chat.';

    const systemPrompt = base ? `${hint}\n\n${base}` : hint;

    // 2. Append memories if any are present.
    if (memories.length === 0) {
      return systemPrompt;
    }

    const memoryBlock =
      'Relevant memories from previous conversations:\n' +
      memories.map((m) => `- ${m}`).join('\n');

    return `${systemPrompt}\n\n${memoryBlock}`;
  }
}
