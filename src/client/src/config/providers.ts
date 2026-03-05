
export const PROVIDER_CATEGORIES: Record<string, string[]> = {
  llm: ['openai', 'flowise', 'openwebui', 'perplexity', 'replicate', 'n8n', 'openswarm'],
  message: ['discord', 'slack', 'mattermost', 'webhook'],
};

export const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  flowise: 'Flowise',
  openwebui: 'OpenWebUI',
  perplexity: 'Perplexity',
  replicate: 'Replicate',
  n8n: 'n8n',
  openswarm: 'OpenSwarm',
  discord: 'Discord',
  slack: 'Slack',
  mattermost: 'Mattermost',
  webhook: 'Webhook',
};
