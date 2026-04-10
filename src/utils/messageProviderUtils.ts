/**
 * Message Provider Utilities
 * Stub file for test compatibility
 */

export const getMessageProviderConfig = (providerId: string) => {
  return {
    id: providerId,
    name: providerId,
    enabled: true,
  };
};

export const validateMessageProvider = (config: any) => {
  return true;
};

export const initializeMessageProvider = (config: any) => {
  return Promise.resolve();
};
