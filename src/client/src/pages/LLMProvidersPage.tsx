import React, { useState } from 'react';
import { useModal } from '../hooks/useModal';
import { useBotProviders } from '../hooks/useBotProviders';
import { Card, Button, Badge } from '../components/DaisyUI';
import {
  Brain as BrainIcon,
  Plus as AddIcon,
  Settings as ConfigIcon,
  CheckCircle as CheckIcon,
  XCircle as XIcon,
  AlertCircle as WarningIcon,
  Zap as ZapIcon,
  Shield as ShieldIcon,
  Cpu as CpuIcon
} from 'lucide-react';
import { Breadcrumbs } from '../components/DaisyUI';
import { LLMProviderType, LLM_PROVIDER_CONFIGS } from '../types/bot';
import ProviderConfigModal from '../components/ProviderConfiguration/ProviderConfigModal';

const LLMProvidersPage: React.FC = () => {
  const { modalState, openAddModal, closeModal } = useModal();
  const [globalProviders, setGlobalProviders] = useState<any[]>([]);

  const breadcrumbItems = [
    { label: 'Home', href: '/uber' },
    { label: 'Providers', href: '/uber/providers' },
    { label: 'LLM Providers', href: '/uber/providers/llm', isActive: true }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckIcon className="w-4 h-4 text-success" />;
      case 'error':
        return <XIcon className="w-4 h-4 text-error" />;
      case 'testing':
        return <WarningIcon className="w-4 h-4 text-warning" />;
      default:
        return <XIcon className="w-4 h-4 text-base-content/40" />;
    }
  };

  const getProviderFeatures = (type: LLMProviderType) => {
    switch (type) {
      case 'openai':
        return [
          { icon: <ZapIcon className="w-3 h-3" />, text: 'GPT-4 & GPT-3.5' },
          { icon: <ShieldIcon className="w-3 h-3" />, text: 'Enterprise Security' },
          { icon: <CpuIcon className="w-3 h-3" />, text: 'High Performance' }
        ];
      case 'anthropic':
        return [
          { icon: <BrainIcon className="w-3 h-3" />, text: 'Claude 3 Models' },
          { icon: <ShieldIcon className="w-3 h-3" />, text: 'Constitutional AI' },
          { icon: <ZapIcon className="w-3 h-3" />, text: 'Long Context' }
        ];
      case 'ollama':
        return [
          { icon: <CpuIcon className="w-3 h-3" />, text: 'Local Deployment' },
          { icon: <ShieldIcon className="w-3 h-3" />, text: 'Privacy First' },
          { icon: <ZapIcon className="w-3 h-3" />, text: 'Open Source' }
        ];
      case 'custom':
        return [
          { icon: <ConfigIcon className="w-3 h-3" />, text: 'Full Customization' },
          { icon: <ZapIcon className="w-3 h-3" />, text: 'Any API' },
          { icon: <ShieldIcon className="w-3 h-3" />, text: 'Self-Hosted' }
        ];
      default:
        return [];
    }
  };

  const handleAddProvider = (providerType: LLMProviderType) => {
    openAddModal('global', 'llm');
  };

  const handleProviderSubmit = (providerData: any) => {
    // For global provider management, we would store these globally
    console.log('Adding global provider:', providerData);
    closeModal();
  };

  const providerTypes = Object.keys(LLM_PROVIDER_CONFIGS) as LLMProviderType[];

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 mb-8">
        <h1 className="text-4xl font-bold mb-2">LLM Providers</h1>
        <p className="text-base-content/70">
          Configure AI model providers for intelligent bot responses and reasoning
        </p>
      </div>

      {/* Fallback Strategy Explanation */}
      <Card className="bg-secondary/5 border border-secondary/20 mb-8">
        <div className="card-body">
          <h2 className="card-title text-xl mb-4">
            <ShieldIcon className="w-6 h-6 mr-2" />
            Fallback Strategy
          </h2>
          <p className="text-base-content/70 mb-4">
            Bots use LLM providers in a failover chain - the first available provider is used,
            and if it becomes unavailable or errors, the next provider in the chain takes over automatically.
          </p>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">Primary</Badge>
            <span className="text-sm text-base-content/60">→</span>
            <Badge variant="neutral">Fallback 1</Badge>
            <span className="text-sm text-base-content/60">→</span>
            <Badge variant="neutral">Fallback 2</Badge>
          </div>
        </div>
      </Card>

      {/* Provider Types Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Available Provider Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {providerTypes.map((type) => {
            const config = LLM_PROVIDER_CONFIGS[type];
            const features = getProviderFeatures(type);

            return (
              <Card key={type} className="bg-base-100 shadow-lg border border-base-300 hover:shadow-xl transition-shadow duration-200">
                <div className="card-body">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{config.icon}</div>
                      <div>
                        <h3 className="card-title text-lg">{config.name}</h3>
                        <p className="text-sm text-base-content/60">{type}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" size="sm">
                      {config.requiredFields.length} required
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-base-content/70 mb-4">
                    {config.description}
                  </p>

                  {/* Features */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-base-content/80 mb-2">Key Features</h4>
                    <div className="flex flex-wrap gap-2">
                      {features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-1 text-xs text-base-content/60">
                          {feature.icon}
                          <span>{feature.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Required Fields */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-base-content/80 mb-2">Required Fields</h4>
                    <div className="flex flex-wrap gap-1">
                      {config.requiredFields.map((field) => (
                        <Badge key={field.key} color="neutral" variant="outline" className="text-xs">
                          {field.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Optional Fields */}
                  {config.optionalFields.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-base-content/80 mb-2">Optional Fields</h4>
                      <div className="flex flex-wrap gap-1">
                        {config.optionalFields.map((field) => (
                          <Badge key={field.key} color="ghost" variant="outline" className="text-xs">
                            {field.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="card-actions justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddProvider(type)}
                      className="w-full"
                    >
                      <AddIcon className="w-4 h-4 mr-2" />
                      Configure {config.name}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Configuration Guide */}
      <Card className="bg-secondary/5 border border-secondary/20">
        <div className="card-body">
          <h2 className="card-title text-xl mb-4">
            <ConfigIcon className="w-6 h-6 mr-2" />
            Configuration Guide
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 text-secondary">🤖 OpenAI Setup</h3>
              <ul className="space-y-2 text-sm text-base-content/70">
                <li>• Get API Key from OpenAI Platform</li>
                <li>• Set Organization ID (if applicable)</li>
                <li>• Choose model (gpt-4, gpt-3.5-turbo)</li>
                <li>• Configure rate limits and usage</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-secondary">🧠 Anthropic Setup</h3>
              <ul className="space-y-2 text-sm text-base-content/70">
                <li>• Get API Key from Anthropic Console</li>
                <li>• Choose Claude model (claude-3-opus, sonnet)</li>
                <li>• Set max tokens and temperature</li>
                <li>• Configure safety settings</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-secondary">🦙 Ollama Setup</h3>
              <ul className="space-y-2 text-sm text-base-content/70">
                <li>• Install Ollama locally or on server</li>
                <li>• Pull desired models (llama2, mistral)</li>
                <li>• Configure Ollama API endpoint</li>
                <li>• Set model parameters</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-secondary">⚙️ Custom API Setup</h3>
              <ul className="space-y-2 text-sm text-base-content/70">
                <li>• Set custom API endpoint URL</li>
                <li>• Configure authentication headers</li>
                <li>• Define request/response format</li>
                <li>• Set up model-specific parameters</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Provider Configuration Modal */}
      <ProviderConfigModal
        modalState={{
          ...modalState,
          providerType: 'llm'
        }}
        onClose={closeModal}
        onSubmit={handleProviderSubmit}
      />
    </div>
  );
};

export default LLMProvidersPage;