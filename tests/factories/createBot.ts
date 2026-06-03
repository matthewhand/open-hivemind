export function createBot(overrides: Record<string, any> = {}) {
  return {
    id: 'bot456',
    name: 'Default Bot',
    provider: 'discord',
    status: 'online',
    ...overrides,
  };
}
