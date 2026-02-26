import type { OpenAiService } from '@src/integrations/openai/OpenAiService';
/**
 * Completes a sentence using the OpenAI API.
 *
 * @param client - The OpenAiService instance.
 * @param content - The content to complete.
 * @returns The completed sentence.
 */
export declare function completeSentence(client: OpenAiService, content: string): Promise<string>;
//# sourceMappingURL=completeSentence.d.ts.map