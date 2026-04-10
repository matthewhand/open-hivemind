/**
 * LLM Provider Utilities
 * Stub file for test compatibility
 */

export const getLlmProviderConfig = (providerId: string) => {
  return {
    id: providerId,
    name: providerId,
    enabled: true
  };
};

export const validateLlmProvider = (config: any) => {
  return true;
};

export const initializeLlmProvider = (config: any) => {
  return Promise.resolve();
};