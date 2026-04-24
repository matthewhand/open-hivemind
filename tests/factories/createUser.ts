export function createUser(overrides: Record<string, any> = {}) {
  return {
    id: 'user123',
    name: 'Default User',
    email: 'user@example.com',
    role: 'user',
    ...overrides,
  };
}
