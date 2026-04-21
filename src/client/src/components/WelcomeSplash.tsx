import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Bot,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';
import Card from './DaisyUI/Card';
import Button from './DaisyUI/Button';
import { Alert } from './DaisyUI/Alert';
import { Badge } from './DaisyUI/Badge';
import Steps from './DaisyUI/Steps';
import { apiService } from '../services/api';

const TipRotator = React.lazy(() => import('./TipRotator'));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConfigStatus {
  llmConfigured: boolean;
  botConfigured: boolean;
  messengerConfigured: boolean;
}

interface ConfigTip {
  id: 'llm' | 'bot' | 'messenger';
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  actionLabel: string;
  route: string;
  completed: boolean;
  tip: string;
}

// ---------------------------------------------------------------------------
// WelcomeSplash Component
// ---------------------------------------------------------------------------

/**
 * WelcomeSplash - Dynamic welcome screen shown when configuration is incomplete.
 * Shows a carousel of configuration tips that disappear as items are configured,
 * alongside announcements and user tips.
 */
const WelcomeSplash: React.FC = () => {
  const navigate = useNavigate();
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch configuration status
  const fetchConfigStatus = useCallback(async () => {
    try {
      const data = await apiService.get<any>('/api/dashboard/config-status');
      setConfigStatus(data?.data || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch config status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigStatus();
  }, [fetchConfigStatus]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchConfigStatus();
    setTimeout(() => setRefreshing(false), 500);
  };

  // Build dynamic tips based on config status
  const configTips: ConfigTip[] = [
    {
      id: 'llm',
      title: 'Configure LLM Provider',
      description: 'Connect AI providers like OpenAI, Anthropic, Google, or Ollama to power your bots.',
      icon: <Cpu className="w-8 h-8" />,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      actionLabel: 'Configure LLM',
      route: '/onboarding',
      completed: configStatus?.llmConfigured || false,
      tip: 'Tip: You can configure multiple LLM providers and switch between them per bot.',
    },
    {
      id: 'bot',
      title: 'Create Your First Bot',
      description: 'Define your AI bot with a unique personality, name, and behavior patterns.',
      icon: <Bot className="w-8 h-8" />,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      actionLabel: 'Create Bot',
      route: '/onboarding',
      completed: configStatus?.botConfigured || false,
      tip: 'Tip: Use detailed system prompts to give your bot specific expertise and personality.',
    },
    {
      id: 'messenger',
      title: 'Connect a Messenger',
      description: 'Link your bot to Discord, Slack, or Mattermost to start interacting with users.',
      icon: <MessageSquare className="w-8 h-8" />,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      actionLabel: 'Connect Messenger',
      route: '/onboarding',
      completed: configStatus?.messengerConfigured || false,
      tip: 'Tip: You can connect multiple messengers and route different bots to different channels.',
    },
  ];

  // Filter out completed items
  const pendingTips = configTips.filter((tip) => !tip.completed);
  const completedTips = configTips.filter((tip) => tip.completed);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-base-content/60">Checking configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6">
        <Alert status="error" onClose={() => setError(null)}>
          <span>{error}</span>
          <Button variant="ghost" size="xs" onClick={handleRefresh}>
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  // If all configs are complete, don't show welcome splash
  if (pendingTips.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center space-y-4 py-6">
        <div className="flex justify-center mb-4">
          <div className="p-5 bg-primary/10 rounded-full">
            <Sparkles className="w-16 h-16 text-primary" />
          </div>
        </div>
        <h2 className="text-4xl font-bold">Welcome to Open-Hivemind</h2>
        <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
          Your multi-agent AI platform for creating intelligent bots across messaging platforms.
        </p>
      </div>

      {/* User Tips */}
      <React.Suspense fallback={null}>
        <TipRotator className="flex items-center gap-2 text-sm text-base-content/70 px-4" />
      </React.Suspense>

      {/* Configuration Progress */}
      <Card className="bg-base-100 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Setup Progress
          </h3>
          <Button variant="ghost" size="sm" onClick={handleRefresh} loading={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Steps Indicator */}
        <Steps
          className="w-full mb-6"
          items={configTips.map((tip) => ({
            color: tip.completed ? 'success' : 'primary',
            dataContent: tip.completed ? '✓' : '',
            label: (
              <span className={`text-xs ${tip.completed ? 'font-semibold' : ''}`}>
                {tip.title.split(' ')[1] || tip.title}
              </span>
            ),
          }))}
        />

        {/* Pending Configuration Tips */}
        {pendingTips.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-base-content/80">
              {pendingTips.length === configTips.length
                ? 'Get started with these essential steps:'
                : `Complete your setup (${pendingTips.length} remaining):`}
            </h4>

            <div className="grid gap-4">
              {pendingTips.map((tip) => (
                <Card
                  key={tip.id}
                  className={`border-2 ${
                    tip.id === 'llm'
                      ? 'border-primary/30 hover:border-primary/50'
                      : tip.id === 'bot'
                      ? 'border-secondary/30 hover:border-secondary/50'
                      : 'border-accent/30 hover:border-accent/50'
                  } transition-all hover:shadow-md`}
                  compact
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${tip.bgColor} ${tip.color} flex-shrink-0`}>
                      {tip.icon}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h5 className="font-bold text-lg">{tip.title}</h5>
                          <p className="text-sm text-base-content/70">{tip.description}</p>
                        </div>
                      </div>
                      <Alert status="info" className="bg-base-200 border-0" compact>
                        <Lightbulb className="w-4 h-4 text-warning flex-shrink-0" />
                        <span className="text-xs">{tip.tip}</span>
                      </Alert>
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate(tip.route)}
                        >
                          {tip.actionLabel}
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Items */}
        {completedTips.length > 0 && (
          <div className="mt-6 pt-6 border-t border-base-300">
            <h4 className="font-semibold text-base-content/80 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              Completed Steps
            </h4>
            <div className="grid gap-3">
              {completedTips.map((tip) => (
                <div
                  key={tip.id}
                  className="flex items-center gap-3 p-3 bg-success/5 rounded-lg border border-success/20"
                >
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-medium line-through text-base-content/50">
                      {tip.title}
                    </span>
                  </div>
                  <Badge size="sm" color="success">
                    Done
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Quick Navigation */}
      <div className="text-center text-sm text-base-content/50">
        <p>
          Need help? Visit the{' '}
          <button
            type="button"
            className="link link-primary"
            onClick={() => navigate('/admin/help')}
          >
            Help Center
          </button>{' '}
          or go to{' '}
          <button
            type="button"
            className="link link-primary"
            onClick={() => navigate('/admin/overview')}
          >
            Dashboard
          </button>
        </p>
      </div>
    </div>
  );
};

export default WelcomeSplash;
