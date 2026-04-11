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

  const providerData: AvailableProviderTypes =
    data?.success && data.data ? data.data : EMPTY;

  return {
    data: providerData,
    loading: isLoading,
    error: error ? error.message : (data && !data.success ? (data.error ?? 'Unknown error') : null),
  };
}
