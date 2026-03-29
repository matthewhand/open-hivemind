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
    <div className="space-y-4 md:space-y-6">
      <div className="mb-4 md:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Provider Management</h1>
        <p className="text-sm md:text-base text-base-content/70">
          Configure and manage your messaging, AI, memory, and tool providers for bot instances
        </p>
      </div>

      {/* Provider Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 mb-6 md:mb-8">
        {providerCategories.map((category) => (
          <Card key={category.type} className="bg-base-100 shadow-xl border border-base-300 hover:shadow-2xl transition-shadow duration-200">
            <div className="card-body p-4 sm:p-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
                <div className="flex items-start gap-3 sm:gap-4 flex-1">
                  <div className={`text-${category.color} p-2 sm:p-3 rounded-lg bg-${category.color}/10 flex-shrink-0`}>
                    {category.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="card-title text-lg sm:text-xl md:text-2xl">{category.title}</h2>
                    <p className="text-xs sm:text-sm text-base-content/60 mt-1 line-clamp-2">{category.description}</p>
                  </div>
                </div>
                <Badge variant={category.color} size="small" className="flex-shrink-0">
                  {category.providers.length} types
                </Badge>
              </div>

              {/* Provider Types */}
              <div className="mb-4 sm:mb-6">
                <h3 className="text-xs sm:text-sm font-semibold text-base-content/80 mb-2 sm:mb-3">Available Providers</h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {category.providers.map((provider) => (
                    <Badge key={provider} variant="neutral" className="btn-outline text-xs">
                      {provider}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Features - Collapsible on mobile */}
              <div className="mb-4 sm:mb-6">
                <h3 className="text-xs sm:text-sm font-semibold text-base-content/80 mb-2 sm:mb-3">Features</h3>
                <ul className="space-y-1.5 sm:space-y-2">
                  {category.features.slice(0, 3).map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs sm:text-sm text-base-content/70">
                      <div className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0"></div>
                      <span className="line-clamp-1">{feature}</span>
                    </li>
                  ))}
                  {category.features.length > 3 && (
                    <li className="text-xs text-base-content/50 italic sm:hidden">
                      +{category.features.length - 3} more features
                    </li>
                  )}
                  {category.features.slice(3).map((feature) => (
                    <li key={feature} className="hidden sm:flex items-center gap-2 text-sm text-base-content/70">
                      <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action */}
              <div className="card-actions justify-stretch sm:justify-end">
                <Button
                  variant={category.color}
                  onClick={category.action}
                  className="group w-full sm:w-auto min-h-[44px]"
                >
                  <ConfigIcon className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Configure {category.title.split(' ')[0]}</span>
                  <span className="sm:hidden">Configure</span>
                  <ArrowIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Start Guide */}
      <Card className="bg-base-100/50 border border-dashed border-base-300">
        <div className="card-body p-4 sm:p-6">
          <h2 className="card-title text-lg sm:text-xl mb-3 sm:mb-4">
            <ConfigIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
            Quick Start Guide
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                <span className="text-primary font-bold text-base sm:text-lg">1</span>
              </div>
              <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">Configure Providers</h3>
              <p className="text-xs sm:text-sm text-base-content/60">
                Set up your message and LLM providers with API keys and settings
              </p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                <span className="text-secondary font-bold text-base sm:text-lg">2</span>
              </div>
              <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">Create Bot Instance</h3>
              <p className="text-xs sm:text-sm text-base-content/60">
                Create a new bot and assign providers to handle communication and AI responses
              </p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                <span className="text-accent font-bold text-base sm:text-lg">3</span>
              </div>
              <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">Start Bot</h3>
              <p className="text-xs sm:text-sm text-base-content/60">
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
