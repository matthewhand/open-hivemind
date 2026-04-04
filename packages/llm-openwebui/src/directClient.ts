import Debug from 'debug';
import { http } from '@hivemind/shared-types';
import type { IMessage } from '@message/interfaces/IMessage';

const debug = Debug('app:openWebUI:direct');

type OpenWebUIOverrides = {
  apiUrl: string;
  authHeader?: string;
  model: string;
};

export async function generateChatCompletionDirect(
  overrides: OpenWebUIOverrides,
  userMessage: string,
  historyMessages: IMessage[] = [],
  systemPrompt?: string
): Promise<string> {
  if (!overrides?.apiUrl || !overrides?.model) {
    throw new Error('OpenWebUI overrides require apiUrl and model');
  }
  const baseURL = overrides.apiUrl.replace(/\/$/, '');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (overrides.authHeader) {
    headers['Authorization'] = overrides.authHeader;
  }
  const client = http.create(baseURL, headers);

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt && systemPrompt.trim()) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  for (const h of historyMessages) {
    try {
      const role = (h as any).role || 'user';
      const content = h.getText();
      messages.push({ role, content });
    } catch {
      // ignore malformed
    }
  }
  messages.push({ role: 'user', content: userMessage });

  try {
    const data = await client.post<{ choices: Array<{ message: { content: string } }> }>('/chat/completions', {
      model: overrides.model,
      messages,
    });
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text === 'string' && text.length > 0) {
      return text;
    }
    debug('No choices[0].message.content; returning empty');
    return '';
  } catch (e: unknown) {
    debug('OpenWebUI direct error', e instanceof Error ? e.message : e);
    throw new Error('OpenWebUI direct request failed');
  }
}
