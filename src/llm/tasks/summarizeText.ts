import { getTaskLlm } from '@llm/taskLlmRouter';

export async function summarizeText(
  text: string,
  opts?: { maxWords?: number; maxTokensOverride?: number },
): Promise<string> {
  const maxWords = Math.max(10, Number(opts?.maxWords ?? 80));
  const { provider, metadata } = await getTaskLlm('summary', {
    baseMetadata: { maxTokensOverride: opts?.maxTokensOverride ?? 200 },
  });

  const prompt = `Summarize the following text in <= ${maxWords} words. Keep it factual and concise.\n\nTEXT:\n${text}`;
  return provider.generateChatCompletion(prompt, [], metadata);
}

