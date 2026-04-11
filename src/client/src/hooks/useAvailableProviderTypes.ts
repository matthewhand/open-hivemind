import { useApiQuery } from './useApiQuery';

export interface ProviderField {
  name: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  default?: string;
  options?: string[];
}

export interface ProviderSchema {
  key: string;
  label: string;
  type: 'llm' | 'messenger' | 'memory';
  docsUrl?: string;
  fields: {
    required: ProviderField[];
    optional: ProviderField[];
    advanced: ProviderField[];
  };
}

interface AvailableProviderTypes {
  llm: ProviderSchema[];
  messenger: ProviderSchema[];
  memory: ProviderSchema[];
}

interface ApiResponse {
  success: boolean;
  data: AvailableProviderTypes;
  error?: string;
}

const EMPTY: AvailableProviderTypes = { llm: [], messenger: [], memory: [] };

export function useAvailableProviderTypes() {
  const { data, isLoading, error } = useApiQuery<ApiResponse>(
    '/api/admin/available-provider-types',
    { ttl: 60_000 },
  );

  const rawData = data?.success && data.data ? data.data : null;
  const providerData: AvailableProviderTypes = {
    llm: Array.isArray(rawData?.llm) ? rawData.llm : [],
    messenger: Array.isArray(rawData?.messenger) ? rawData.messenger : [],
    memory: Array.isArray(rawData?.memory) ? rawData.memory : [],
  };

  return {
    data: providerData,
    loading: isLoading,
    error: error ? error.message : (data && !data.success ? (data.error ?? 'Unknown error') : null),
  };
}
