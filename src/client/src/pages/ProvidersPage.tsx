import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../components/DaisyUI';
import {
  MessageCircle as MessageIcon,
  Brain as LLMIcon,
  Settings as ConfigIcon,
  ArrowRight as ArrowIcon,
} from 'lucide-react';
import { Breadcrumbs } from '../components/DaisyUI';

const ProvidersPage: React.FC = () => {
  const navigate = useNavigate();
  const breadcrumbItems = [
    { label: 'Admin', href: '/admin/overview' },
    { label: 'Providers', href: '/admin/providers', isActive: true },
  ];

  const providerCategories = [
    {
      title: 'Message Providers',
      description: 'Configure Discord, Telegram, Slack, and Webhook providers for bot communication',
      icon: <MessageIcon className="w-12 h-12" />,
      color: 'primary' as const,
      providers: ['Discord', 'Telegram', 'Slack', 'Webhook'],
      action: () => navigate('/admin/providers/message'),
      features: [
        'Real-time messaging integration',
        'Multi-platform support',
        'Webhook customization',
        'Channel management',
      ],
    },
    {
      title: 'LLM Providers',
      description: 'Set up OpenAI, Anthropic, Ollama, and custom LLM providers for AI responses',
      icon: <LLMIcon className="w-12 h-12" />,
      color: 'secondary' as const,
      providers: ['OpenAI', 'Anthropic', 'Ollama', 'Custom'],
      action: () => navigate('/admin/providers/llm'),
      features: [
        'Multiple AI model support',
        'Fallback configuration',
        'Custom model integration',
        'API key management',
      ],
    },
  ];

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 mb-8">
        <h1 className="text-4xl font-bold mb-2">Provider Management</h1>
        <p className="text-base-content/70">
          Configure and manage your messaging and AI providers for bot instances
        </p>
      </div>

      {/* Provider Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {providerCategories.map((category) => (
          <Card key={category.title} className="bg-base-100 shadow-xl border border-base-300 hover:shadow-2xl transition-shadow duration-200">
            <div className="card-body">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`text-${category.color} p-3 rounded-lg bg-${category.color}/10`}>
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