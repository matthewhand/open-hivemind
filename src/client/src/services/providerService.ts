import axios from 'axios';

export interface ProviderInfo {
  key: string;
  label: string;
  docsUrl?: string;
  helpText?: string;
}

export const getLlmProviders = async (): Promise<ProviderInfo[]> => {
  const response = await axios.get('/api/admin/llm-providers');
  return response.data.providers;
};

export const getMessengerProviders = async (): Promise<ProviderInfo[]> => {
  const response = await axios.get('/api/admin/messenger-providers');
  return response.data.providers;
};
