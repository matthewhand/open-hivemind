/**
 * Message Provider Utilities
 * Stub file for test compatibility
 */

// Stub for jest.mock compatibility
export async function getMessengerProvider(_botConfig: any): Promise<any[]> {
  return [];
}

export const getMessageProviderConfig = (
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

export const validateMessageProvider = (_config: any): boolean => {
  return true;
};

export const initializeMessageProvider = (_config: any): Promise<void> => {
  return Promise.resolve();
};
