/**
 * LLM Provider Utilities
 * Stub file for test compatibility
 */

// Stub for jest.mock compatibility
export async function getLlmProviderForBot(_botConfig: any): Promise<any> {
  return null;
}

export const getLlmProviderConfig = (providerId: string) => {
  return {
    id: providerId,
    name: providerId,
    enabled: true,
  };
};

export const validateLlmProvider = (_config: any) => {
  return true;
};

export const initializeLlmProvider = (_config: any) => {
  return Promise.resolve();
};
