import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Cpu, Rocket, X, HelpCircle } from 'lucide-react';
import Dashboard from '../components/Dashboard';
import { apiService } from '../services/api';
import { Alert } from '../components/DaisyUI/Alert';
import Button from '../components/DaisyUI/Button';
import Card from '../components/DaisyUI/Card';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import Tabs from '../components/DaisyUI/Tabs';
import Toggle from '../components/DaisyUI/Toggle';
import Carousel from '../components/DaisyUI/Carousel';
import DashboardWidgetSystem from '../components/DaisyUI/DashboardWidgetSystem';
import WelcomeSplash from '../components/WelcomeSplash';
import QuickActions from '../components/QuickActions';

const SystemHealth = lazy(() => import('../components/SystemHealth'));
const ActivityPage = lazy(() => import('./ActivityPage'));
const MonitoringDashboard = lazy(() => import('./MonitoringDashboard'));

const SuspenseFallback: React.FC = () => (
  <div className="flex justify-center items-center min-h-[200px]">
    <LoadingSpinner size="lg" />
  </div>
);

const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const [checked, setChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [announcementDesc, setAnnouncementDesc] = useState<string>('');
  const [showGettingStarted, setShowGettingStarted] = useState(
    () => localStorage.getItem('hivemind-show-getting-started') !== 'false',
  );

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
        const completed = data?.completed ?? data?.data?.completed ?? false;
        if (!completed) {
          navigate('/onboarding', { replace: true });
          return;
        }

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

    const interval = setInterval(checkOnboarding, 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  // Listen for changes to the Getting Started localStorage preference
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'hivemind-show-getting-started') {
        setShowGettingStarted(e.newValue !== 'false');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const gettingStartedVisible = showGettingStarted || needsSetup;

  // Build tab list dynamically — Getting Started tab is conditional
  const tabs = useMemo(() => [
    ...(gettingStartedVisible
      ? [{ key: 'getting-started', label: 'Getting Started' }]
      : []),
    { key: 'overview', label: 'Overview' },
    { key: 'activity', label: 'Activity' },
    { key: 'monitoring', label: 'Monitoring' },
  ], [gettingStartedVisible]);

  if (!checked) {
    return null;
  }

  const dismissGettingStarted = () => {
    localStorage.setItem('hivemind-show-getting-started', 'false');
    setShowGettingStarted(false);
  };

  const restoreGettingStarted = () => {
    localStorage.setItem('hivemind-show-getting-started', 'true');
    setShowGettingStarted(true);
  };

  const carouselItems = [
    { image: '', title: '🤖 Configure Your First Bot', description: 'Set up an AI agent — assign a persona, connect a messaging platform, and choose an LLM provider.', bgGradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)', link: '/admin/bots' },
    { image: '', title: '🧠 Connect an LLM Provider', description: 'Add your OpenAI, Anthropic, Flowise, or Ollama API key to power bot responses.', bgGradient: 'linear-gradient(135deg, #059669, #10b981)', link: '/admin/providers/llm' },
    { image: '', title: '🎭 Create a Persona', description: 'Give your bot a unique personality — name, system prompt, response behavior, and avatar.', bgGradient: 'linear-gradient(135deg, #0891b2, #06b6d4)', link: '/admin/personas' },
    { image: '', title: '🛡️ Set Up Guard Profiles', description: 'Add safety rules — access control, rate limiting, and content filtering for your bots.', bgGradient: 'linear-gradient(135deg, #d97706, #f59e0b)', link: '/admin/guards' },
    { image: '', title: '📊 Real-time Monitoring', description: 'Monitor bot performance, message volume, response times, and system health.', bgGradient: 'linear-gradient(135deg, #7c3aed, #a855f7)', link: '/admin/overview?tab=monitoring' },
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
    if (tab === 'overview') {
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
            tabs={tabs}
            activeTab={activeTab}
            onChange={(tab) => setTab(tab)}
            className="mb-6"
          />
          <div className="mt-4">
            {activeTab === 'getting-started' && gettingStartedVisible && (
              <div className="mx-4 mb-6 rounded-xl bg-base-200/50 border border-base-300 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/60">Getting Started</h3>
                  <button
                    className="btn btn-ghost btn-xs gap-1 text-base-content/40 hover:text-base-content/70"
                    onClick={dismissGettingStarted}
                    title="Hide Getting Started"
                  >
                    <X className="w-4 h-4" />
                    Hide
                  </button>
                </div>

                {showWelcome && (
                  <div className="max-w-7xl mx-auto mb-4">
                    <WelcomeSplash />
                  </div>
                )}

                {needsSetup && !showWelcome && (
                  <div className="max-w-7xl mx-auto mb-4">
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

                <Carousel items={carouselItems} autoplay={true} interval={6000} variant="full-width" onSlideClick={handleSlideClick} />
              </div>
            )}

            {activeTab === 'overview' && (
              <div>
                <div className="flex items-center justify-between mb-4 px-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/60">Overview</h3>
                    {!gettingStartedVisible && (
                      <button
                        className="btn btn-ghost btn-xs gap-1 text-base-content/40 hover:text-primary"
                        onClick={restoreGettingStarted}
                        title="Show Getting Started guide"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        Getting Started
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 bg-base-100/50 p-2 rounded-lg shadow-sm">
                    <span className="text-sm font-medium opacity-80">Static Layout</span>
                    <Toggle
                      color="primary"
                      checked={useWidgetLayout}
                      onChange={(e) => setUseWidgetLayout(e.target.checked)}
                      aria-label="Toggle widget dashboard layout"
                    />
                    <span className="text-sm font-medium text-primary">Widgets Layout</span>
                  </div>
                </div>

                <QuickActions onRefresh={() => {}} />

                {useWidgetLayout ? (
                  <div className="animate-in fade-in duration-300">
                    <DashboardWidgetSystem />
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-300">
                    <Dashboard />
                  </div>
                )}

                <div className="divider mx-4" />

                <div className="px-4 pb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/60 mb-4">System Health</h3>
                  <Suspense fallback={<SuspenseFallback />}>
                    <SystemHealth refreshInterval={30000} />
                  </Suspense>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <Suspense fallback={<SuspenseFallback />}>
                <ActivityPage />
              </Suspense>
            )}

            {activeTab === 'monitoring' && (
              <Suspense fallback={<SuspenseFallback />}>
                <MonitoringDashboard />
              </Suspense>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OverviewPage;
