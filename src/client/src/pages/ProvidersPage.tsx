import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/DaisyUI/Card';
import Button from '../components/DaisyUI/Button';
import Badge from '../components/DaisyUI/Badge';
import {
  MessageCircle as MessageIcon,
  Brain as LLMIcon,
  Database as MemoryIcon,
  Wrench as ToolIcon,
  Settings as ConfigIcon,
  ArrowRight as ArrowIcon,
} from 'lucide-react';

import { getProviderSchemasByType } from '../provider-configs';

// Icon mapping for provider types
const TYPE_ICONS = {
  message: MessageIcon,
  llm: LLMIcon,
  memory: MemoryIcon,
  tool: ToolIcon,
} as const;

// Title mapping for provider types
const TYPE_TITLES: Record<string, string> = {
  message: 'Message Providers',
  llm: 'LLM Providers',
  memory: 'Memory Providers',
  tool: 'Tool Providers',
};

// Description mapping for provider types
const TYPE_DESCRIPTIONS: Record<string, string> = {
  message: 'Configure Discord, Telegram, Slack, and other messaging providers for bot communication',
  llm: 'Set up OpenAI, Flowise, Letta, and other LLM providers for AI responses',
  memory: 'Configure memory providers for persistent context and knowledge storage',
  tool: 'Set up tool providers for extended capabilities and integrations',
};

// Feature mapping for provider types
const TYPE_FEATURES: Record<string, string[]> = {
  message: [
    'Real-time messaging integration',
    'Multi-platform support',
    'Webhook customization',
    'Channel management',
  ],
  llm: [
    'Multiple AI model support',
    'Fallback configuration',
    'Custom model integration',
    'API key management',
  ],
  memory: [
    'Persistent context storage',
    'Knowledge management',
    'Cross-session memory',
    'Vector embeddings',
  ],
  tool: [
    'Extended capabilities',
    'External integrations',
    'MCP server support',
    'Custom tooling',
  ],
};

// Static Tailwind class mappings (dynamic construction like `text-${color}` is not JIT-safe)
const colorClasses: Record<string, { text: string; bg: string }> = {
  primary: { text: 'text-primary', bg: 'bg-primary/10' },
  secondary: { text: 'text-secondary', bg: 'bg-secondary/10' },
  accent: { text: 'text-accent', bg: 'bg-accent/10' },
  info: { text: 'text-info', bg: 'bg-info/10' },
  success: { text: 'text-success', bg: 'bg-success/10' },
  warning: { text: 'text-warning', bg: 'bg-warning/10' },
  error: { text: 'text-error', bg: 'bg-error/10' },
};

const ProvidersPage: React.FC = () => {
  const navigate = useNavigate();

  // Generate provider categories dynamically from schemas
  const providerCategories = useMemo(() => {
    const types: ('message' | 'llm' | 'memory' | 'tool')[] = ['message', 'llm', 'memory', 'tool'];

    return types.map((type) => {
      const schemas = getProviderSchemasByType(type);
      const Icon = TYPE_ICONS[type];
      const color = type === 'message' ? 'primary' as const :
                    type === 'llm' ? 'secondary' as const :
                    type === 'memory' ? 'accent' as const :
                    'info' as const;

      return {
        type,
        title: TYPE_TITLES[type],
        description: TYPE_DESCRIPTIONS[type],
        icon: <Icon className="w-12 h-12" />,
        color,
        providers: schemas.map(schema => schema.displayName),
        action: () => navigate(`/admin/providers/${type}`),
        features: TYPE_FEATURES[type],
      };
    }).filter(category => category.providers.length > 0);
  }, [navigate]);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Provider Management</h1>
        <p className="text-base-content/70">
          Configure and manage your messaging, AI, memory, and tool providers for bot instances
        </p>
      </div>

      {/* Provider Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {providerCategories.map((category) => (
          <Card key={category.type} className="bg-base-100 shadow-xl border border-base-300 hover:shadow-2xl transition-shadow duration-200">
            <div className="card-body">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`${colorClasses[category.color]?.text ?? ''} p-3 rounded-lg ${colorClasses[category.color]?.bg ?? ''}`}>
                    {category.icon}
                  </div>
                  <div>
                    <h2 className="card-title text-2xl">{category.title}</h2>
                    <p className="text-base-content/60 mt-1">{category.description}</p>
                  </div>
                </div>
                <Badge variant={category.color} size="small">
                  {category.providers.length} types
                </Badge>
              </div>

              {/* Provider Types */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-base-content/80 mb-3">Available Providers</h3>
                <div className="flex flex-wrap gap-2">
                  {category.providers.map((provider) => (
                    <Badge key={provider} variant="neutral" className="btn-outline text-xs">
                      {provider}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-base-content/80 mb-3">Features</h3>
                <ul className="space-y-2">
                  {category.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-base-content/70">
                      <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action */}
              <div className="card-actions justify-end">
                <Button
                  variant={category.color}
                  onClick={category.action}
                  className="group"
                >
                  <ConfigIcon className="w-4 h-4 mr-2" />
                  Configure {category.title.split(' ')[0]}
                  <ArrowIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Start Guide */}
      <Card className="bg-base-100/50 border border-dashed border-base-300">
        <div className="card-body">
          <h2 className="card-title text-xl mb-4">
            <ConfigIcon className="w-6 h-6 mr-2" />
            Quick Start Guide
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-primary font-bold text-lg">1</span>
              </div>
              <h3 className="font-semibold mb-2">Configure Providers</h3>
              <p className="text-sm text-base-content/60">
                Set up your message and LLM providers with API keys and settings
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-secondary font-bold text-lg">2</span>
              </div>
              <h3 className="font-semibold mb-2">Create Bot Instance</h3>
              <p className="text-sm text-base-content/60">
                Create a new bot and assign providers to handle communication and AI responses
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-accent font-bold text-lg">3</span>
              </div>
              <h3 className="font-semibold mb-2">Start Bot</h3>
              <p className="text-sm text-base-content/60">
                Launch your bot and watch it connect to providers and start responding
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProvidersPage;
