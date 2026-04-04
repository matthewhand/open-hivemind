async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface ProviderInfo {
  key: string;
  label: string;
  docsUrl?: string;
  helpText?: string;
}

export const getLlmProviders = async (): Promise<ProviderInfo[]> => {
  const data = await apiFetch<{ providers: ProviderInfo[] }>('/api/admin/llm-providers');
  return data.providers;
};

export const getMessengerProviders = async (): Promise<ProviderInfo[]> => {
  const data = await apiFetch<{ providers: ProviderInfo[] }>('/api/admin/messenger-providers');
  return data.providers;
};
