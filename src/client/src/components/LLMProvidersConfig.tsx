import React from 'react';
import { KeyIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import BaseProvidersConfig from './ProviderManagement/BaseProvidersConfig';

const LLMProvidersConfig: React.FC = () => {
  const llmProviderTypes = [
    { value: 'openai', label: 'OpenAI', docsUrl: 'https://platform.openai.com/api-keys' },
    { value: 'anthropic', label: 'Anthropic (Claude)', docsUrl: 'https://console.anthropic.com/settings/keys' },
    { value: 'flowise', label: 'Flowise', docsUrl: 'https://docs.flowiseai.com/getting-started' },
    { value: 'openwebui', label: 'OpenWebUI', docsUrl: 'https://docs.openwebui.com/getting-started/' },
    { value: 'openswarm', label: 'OpenSwarm', docsUrl: 'https://openswarm.ai/docs/getting-started' },
  ];

  return (
    <BaseProvidersConfig
      apiEndpoint="/api/admin/llm-providers"
      providerTypeOptions={llmProviderTypes}
      title="LLM Providers"
      emptyStateIcon={<KeyIcon className="w-16 h-16" />}
      emptyStateTitle="No LLM Providers"
      emptyStateMessage="Configure LLM providers to connect your bots to AI services like OpenAI, Flowise, or OpenWebUI."
      refreshIcon={<ArrowPathIcon className="w-5 h-5" />}
    />
  );
};

export default LLMProvidersConfig;
