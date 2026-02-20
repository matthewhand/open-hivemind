import Debug from 'debug';
import { OpenAI } from 'openai';

const debug = Debug('app:logProseSummarizer');

/**
 * Rewrites a log message using a separate LLM call if configured.
 * Triggered by setting LOG_SUMMARY_LLM env var to a model name (e.g. "gpt-4o", "gpt-3.5-turbo").
 */
export async function summarizeLogWithLlm(originalProse: string): Promise<string> {
  const model = process.env.LOG_SUMMARY_LLM;

  // If feature is disabled (env var not set), return original prose immediately
  if (!model) {
    return originalProse;
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    if (!apiKey) {
      debug('LOG_SUMMARY_LLM set but OPENAI_API_KEY missing. Skipping rewrite.');
      return originalProse;
    }

    const openai = new OpenAI({ apiKey, baseURL });

    debug(`Rewriting log using ${model}...`);

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            "Rewrite the following bot log message to be cynical, sardonic, and extremely laconic. Keep it short (under 15 words) but very expressive of the bot's internal monologue. Do not use quotes.",
        },
        {
          role: 'user',
          content: originalProse,
        },
      ],
      max_tokens: 50,
      temperature: 0.8,
    });

    const rewritten = response.choices[0]?.message?.content?.trim();
    if (rewritten) {
      debug(`Rewritten: "${rewritten}"`);
      return rewritten;
    }
  } catch (err) {
    debug('Failed to summarize log with LLM:', err);
  }

  return originalProse;
}
