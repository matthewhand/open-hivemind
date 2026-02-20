
export const PROVIDER_CATEGORIES: Record<string, string[]> = {
  llm: ['openai', 'flowise', 'openwebui', 'ollama', 'anthropic', 'gemini', 'groq'],
  message: ['discord', 'slack', 'mattermost', 'telegram', 'whatsapp'],
};

export const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  flowise: 'Flowise',
  openwebui: 'OpenWebUI',
  ollama: 'Ollama',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
  groq: 'Groq',
  discord: 'Discord',
  slack: 'Slack',
  mattermost: 'Mattermost',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
};
