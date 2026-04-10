import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Cpu, Rocket } from 'lucide-react';
import Dashboard from '../../components/Dashboard';
import { apiService } from '../../services/api';
import { Alert } from '../../components/DaisyUI/Alert';
import Button from '../../components/DaisyUI/Button';
import Card from '../../components/DaisyUI/Card';
import { LoadingSpinner } from '../../components/DaisyUI/Loading';
import Tabs from '../../components/DaisyUI/Tabs';
import Toggle from '../../components/DaisyUI/Toggle';
import Carousel from '../../components/DaisyUI/Carousel';
import DashboardWidgetSystem from '../../components/DaisyUI/DashboardWidgetSystem';
import WelcomeSplash from '../../components/WelcomeSplash';
import QuickActions from '../../components/QuickActions';

const SystemHealth = lazy(() => import('../../components/SystemHealth'));

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const [checked, setChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [announcementDesc, setAnnouncementDesc] = useState<string>('');

  // Fetch announcement text
  useEffect(() => {
    apiService.get<{ announcement?: string }>('/api/dashboard/announcement')
      .then((data: any) => {
        const text = data?.announcement || '';
        if (text) {
          const firstLine = text.split('\n').find((l: string) => l.trim()) || '';
          setAnnouncementDesc(firstLine.length > 120 ? firstLine.slice(0, 120) + '...' : firstLine);
        }
      })
      .catch(() => { /* no announcement */ });
  }, []);

  // Track preference for widget vs static layout
  const [useWidgetLayout, setUseWidgetLayout] = useState(() => {
    const saved = localStorage.getItem('hivemind-dashboard-layout');
    return saved === 'widget';
  });

  // Save preference when it changes
  useEffect(() => {
    localStorage.setItem('hivemind-dashboard-layout', useWidgetLayout ? 'widget' : 'static');
  }, [useWidgetLayout]);

  useEffect(() => {
    const checkOnboarding = async (): Promise<void> => {
      try {
        const data = await apiService.get<any>('/api/onboarding/status');
        if (!data.completed) {
          navigate('/onboarding', { replace: true });
          return;
        }

        // Even if onboarding is "completed", check if LLM is actually configured.
        // This catches the case where bots exist from env but no LLM key is set.
        try {
          const configStatus = await apiService.get<any>('/api/dashboard/config-status');
          const status = configStatus?.data || configStatus;
          const anyIncomplete = !status.llmConfigured || !status.botConfigured || !status.messengerConfigured;
          setShowWelcome(anyIncomplete);
          if (anyIncomplete) {
            setNeedsSetup(true);
          }
        } catch { /* proceed normally */ }
      } catch {
        // If the endpoint is unavailable, proceed to dashboard normally
      }
      setChecked(true);
    };
    checkOnboarding();

    // Poll every 5 seconds to check if config has been updated
    const interval = setInterval(checkOnboarding, 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  if (!checked) {
    return null; // brief blank while checking onboarding status
  }

  const carouselItems = [
    { image: '', title: '🤖 Configure Your First Bot', description: 'Set up an AI agent — assign a persona, connect a messaging platform, and choose an LLM provider.', bgGradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
    { image: '', title: '🧠 Connect an LLM Provider', description: 'Add your OpenAI, Anthropic, Flowise, or Ollama API key to power bot responses.', bgGradient: 'linear-gradient(135deg, #059669, #10b981)' },
    { image: '', title: '🎭 Create a Persona', description: 'Give your bot a unique personality — name, system prompt, response behavior, and avatar.', bgGradient: 'linear-gradient(135deg, #0891b2, #06b6d4)' },
    { image: '', title: '🛡️ Set Up Guard Profiles', description: 'Add safety rules — access control, rate limiting, and content filtering for your bots.', bgGradient: 'linear-gradient(135deg, #d97706, #f59e0b)' },
    { image: '', title: '📡 Multi-Platform Support', description: 'Connect to Discord, Slack, Mattermost — run coordinated bots across all platforms.', bgGradient: 'linear-gradient(135deg, #dc2626, #ef4444)' },
    { image: '', title: '📊 Real-time Monitoring', description: 'Monitor bot performance, message volume, response times, and system health.', bgGradient: 'linear-gradient(135deg, #7c3aed, #a855f7)' },
    { image: '', title: '📋 Announcements', description: announcementDesc || 'Check out what\'s new and what\'s coming next.', bgGradient: 'linear-gradient(135deg, #1e40af, #3b82f6)', link: 'https://github.com/matthewhand/open-hivemind/blob/main/ANNOUNCEMENT.md' },
  ];

  const handleSlideClick = (item: { link?: string }) => {
    if (item.link) {
      if (item.link.startsWith('http')) {
        window.open(item.link, '_blank');
      } else {
        navigate(item.link);
      }
    }
  };

  const setTab = (tab: string) => {
    if (tab === 'dashboard') {
      searchParams.delete('tab');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ tab });
    }
  };

  return (
    <div>
      <div className="p-6">
      <Card className="shadow-xl">
        <Tabs
          variant="lifted"
          tabs={[
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'health', label: 'Health' },
          ]}
          activeTab={activeTab}
          onChange={(tab) => setTab(tab)}
          className="mb-6"
        />
        <div className="mt-4">

      {activeTab === 'health' ? (
          <Suspense fallback={<LoadingSpinner size="lg" />}>
            <SystemHealth refreshInterval={30000} />
          </Suspense>
      ) : (
      <div>
      {/* Welcome Splash - shown when config is incomplete */}
      {showWelcome && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <WelcomeSplash />
        </div>
      )}

      {/* Incomplete setup prompt - shown when needs setup but not showing welcome */}
      {needsSetup && !showWelcome && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <Alert status="warning" className="shadow-lg" onClose={() => setNeedsSetup(false)}>
            <Cpu className="w-5 h-5 shrink-0" />
            <div className="flex-1">
              <strong>Setup incomplete</strong> — no LLM provider is configured yet. Your bots won't be able to generate responses.
            </div>
            <Button variant="primary" size="sm" onClick={() => navigate('/onboarding')}>
              <Rocket className="w-4 h-4 mr-1" />
              Run Setup Wizard
            </Button>
          </Alert>
        </div>
      )}

      <div className="mb-6 px-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/40 mb-2">Getting Started</h3>
        <Carousel items={carouselItems} autoplay={true} interval={6000} variant="full-width" />
      </div>

      <QuickActions onRefresh={() => {}} />

      <div className="flex justify-end items-center mb-4 px-4 gap-3 bg-base-100/50 p-2 rounded-lg shadow-sm w-fit ml-auto">
        <span className="text-sm font-medium opacity-80">Static Layout</span>
        <Toggle
          color="primary"
          checked={useWidgetLayout}
          onChange={(e) => setUseWidgetLayout(e.target.checked)}
          aria-label="Toggle widget dashboard layout"
        />
        <span className="text-sm font-medium text-primary">Widgets Layout</span>
      </div>

      {useWidgetLayout ? (
        <div className="animate-in fade-in duration-300">
          <DashboardWidgetSystem />
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
          <Dashboard />
        </div>
      )}
    </div>
      )}
    </div>
      </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
