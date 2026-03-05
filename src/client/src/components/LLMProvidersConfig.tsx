import React from 'react';
import { KeyIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import BaseProvidersConfig from './ProviderManagement/BaseProvidersConfig';

const LLMProvidersConfig: React.FC = () => {
  const llmProviderTypes = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'flowise', label: 'Flowise' },
    { value: 'openwebui', label: 'OpenWebUI' },
    { value: 'openswarm', label: 'OpenSwarm' },
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
