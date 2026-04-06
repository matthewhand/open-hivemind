import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Bot,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Lightbulb,
  RefreshCw,
  Rocket,
  Zap,
  BookOpen,
} from 'lucide-react';
import Card from './DaisyUI/Card';
import Button from './DaisyUI/Button';
import { Alert } from './DaisyUI/Alert';
import Steps from './DaisyUI/Steps';
import Carousel from './DaisyUI/Carousel';
import { apiService } from '../services/api';
import AnnouncementBanner from './AnnouncementBanner';
import TipRotator from './TipRotator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConfigStatus {
  llmConfigured: boolean;
  botConfigured: boolean;
  messengerConfigured: boolean;
}

interface CarouselSlide {
  image: string;
  title: string;
  description: string;
  bgGradient: string;
}

// ---------------------------------------------------------------------------
// WelcomeSplash Component
// ---------------------------------------------------------------------------

/**
 * WelcomeSplash - Dynamic welcome screen with a carousel that always shows.
 * Config hint slides disappear as items are configured, leaving permanent
 * slides for announcements, tips, and quick links.
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

  // Build dynamic carousel slides based on config status
  const carouselItems: CarouselSlide[] = useMemo(() => {
    const items: CarouselSlide[] = [];
    const llmDone = configStatus?.llmConfigured || false;
    const botDone = configStatus?.botConfigured || false;
    const messengerDone = configStatus?.messengerConfigured || false;

    // Config hint slides (disappear when configured)
    if (!llmDone) {
      items.push({
        image: '',
        title: 'Configure LLM Provider',
        description: 'Connect AI providers like OpenAI, Anthropic, Google, or Ollama to power your bots.',
        bgGradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
      });
    }

    if (!botDone) {
      items.push({
        image: '',
        title: 'Create Your First Bot',
        description: 'Define your AI bot with a unique personality, name, and behavior patterns.',
        bgGradient: 'linear-gradient(135deg, #059669, #10b981)',
      });
    }

    if (!messengerDone) {
      items.push({
        image: '',
        title: 'Connect a Messenger',
        description: 'Link your bot to Discord, Slack, or Mattermost to start interacting with users.',
        bgGradient: 'linear-gradient(135deg, #dc2626, #ef4444)',
      });
    }

    // Permanent slides (always show)
    items.push({
      image: '',
      title: 'Announcements & Updates',
      description: 'Stay informed with the latest Open-Hivemind news and feature releases.',
      bgGradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
    });

    items.push({
      image: '',
      title: 'Pro Tips & Best Practices',
      description: 'Get the most out of your AI agents with helpful tips and tricks.',
      bgGradient: 'linear-gradient(135deg, #10b981, #059669)',
    });

    items.push({
      image: '',
      title: 'Quick Links & Resources',
      description: 'Access documentation, help center, and common setup tasks.',
      bgGradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    });

    return items;
  }, [configStatus]);

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

  // Steps indicator
  const llmDone = configStatus?.llmConfigured || false;
  const botDone = configStatus?.botConfigured || false;
  const messengerDone = configStatus?.messengerConfigured || false;
  const configSteps = [
    { label: 'LLM', completed: llmDone },
    { label: 'Bot', completed: botDone },
    { label: 'Messenger', completed: messengerDone },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center space-y-4 py-4">
        <div className="flex justify-center mb-3">
          <div className="p-4 bg-primary/10 rounded-full">
            <Sparkles className="w-14 h-14 text-primary" />
          </div>
        </div>
        <h2 className="text-3xl font-bold">Welcome to Open-Hivemind</h2>
        <p className="text-base text-base-content/70 max-w-2xl mx-auto">
          Your multi-agent AI platform for creating intelligent bots across messaging platforms.
        </p>
      </div>

      {/* Configuration Progress Steps */}
      <Card className="bg-base-100 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Setup Progress
          </h3>
          <Button variant="ghost" size="sm" onClick={handleRefresh} loading={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <Steps
          className="w-full"
          items={configSteps.map((step) => ({
            color: step.completed ? 'success' : 'primary',
            dataContent: step.completed ? '✓' : '',
            label: (
              <span className={`text-xs ${step.completed ? 'font-semibold' : ''}`}>
                {step.label}
              </span>
            ),
          }))}
        />
      </Card>

      {/* Carousel */}
      <Card className="bg-base-100 shadow-lg">
        <Carousel items={carouselItems} autoplay={true} interval={6000} variant="full-width" />
      </Card>

      {/* Slide-specific content based on current slide */}
      {/* Announcement & Tips section */}
      <Card className="bg-base-100 shadow">
        <div className="space-y-4">
          <h4 className="font-bold flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-warning" />
            Announcements & Tips
          </h4>
          <AnnouncementBanner />
          <TipRotator className="flex items-center gap-2 text-sm text-base-content/70" />
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-base-100 shadow">
        <h4 className="font-bold mb-3 flex items-center gap-2">
          <Rocket className="w-5 h-5 text-accent" />
          Quick Actions
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {!llmDone && (
            <Button variant="primary" onClick={() => navigate('/onboarding')} className="w-full justify-start">
              <Cpu className="w-4 h-4 mr-2" />
              Configure LLM
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          )}
          {!botDone && (
            <Button variant="secondary" onClick={() => navigate('/onboarding')} className="w-full justify-start">
              <Bot className="w-4 h-4 mr-2" />
              Create Bot
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          )}
          {!messengerDone && (
            <Button variant="accent" onClick={() => navigate('/onboarding')} className="w-full justify-start">
              <MessageSquare className="w-4 h-4 mr-2" />
              Connect Messenger
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate('/admin/help')} className="w-full justify-start">
            <BookOpen className="w-4 h-4 mr-2" />
            Help Center
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default WelcomeSplash;
