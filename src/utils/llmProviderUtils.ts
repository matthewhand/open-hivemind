/**
 * LLM Provider Utilities
 * Stub file for test compatibility
 */

// Stub for jest.mock compatibility

export async function getLlmProviderForBot(_botConfig: any): Promise<any> {
  return null;
}

export const getLlmProviderConfig = (
  providerId: string
): {
  id: string;
  name: string;
  enabled: boolean;
} => {
  return {
    id: providerId,
    name: providerId,
    enabled: true,
  };
};

export const validateLlmProvider = (_config: any): boolean => {
  return true;
};

export const initializeLlmProvider = (_config: any): Promise<void> => {
  return Promise.resolve();
};
