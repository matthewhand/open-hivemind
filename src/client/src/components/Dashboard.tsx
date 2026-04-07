import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService, type Bot, type StatusResponse } from '../services/api';
import { Alert } from './DaisyUI/Alert';
import Button from './DaisyUI/Button';
import Card from './DaisyUI/Card';
import Hero from './DaisyUI/Hero';
import RadialProgress from './DaisyUI/RadialProgress';
import { SkeletonCard } from './DaisyUI/Skeleton';
import { Stat, Stats } from './DaisyUI/Stat';
import DashboardBotCard from './DashboardBotCard';
import TipRotator from './TipRotator';
import QuickActions from './QuickActions';
import AgentGrid from './Dashboard/AgentGrid';
import Carousel from './DaisyUI/Carousel';
import { useMediaQuery } from '../hooks/useBreakpoint';

const getStatusColor = (botStatus: string) => {
  switch (botStatus.toLowerCase()) {
    case 'active':
      return 'success';
    case 'connecting':
      return 'warning';
    case 'inactive':
    case 'unavailable':
      return 'error';
    case 'error':
      return 'error';
    default:
      return 'info';
  }
};

const getProviderIcon = (provider: string) => {
  switch (provider.toLowerCase()) {
    case 'discord':
      return '💬';
    case 'slack':
      return '📢';
    case 'telegram':
      return '✈️';
    case 'mattermost':
      return '💼';
    default:
      return '🤖';
  }
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const isDesktop = useMediaQuery({ minWidth: 1024 });
  const isWide = useMediaQuery({ minWidth: 1440 });
  const [bots, setBots] = useState<Bot[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [botRatings, setBotRatings] = useState<Record<string, number>>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [announcement, setAnnouncement] = useState<string>('');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [configResult, statusResult] = await Promise.allSettled([
        apiService.getConfig(),
        apiService.getStatus(),
      ]);
      const configData = configResult.status === 'fulfilled' ? configResult.value : { bots: [] };
      const statusData = statusResult.status === 'fulfilled' ? statusResult.value : { bots: [] };
      // In demo mode, use status bots (which include fake demo data) as the bot list
      const isDemoMode = (statusData as any)?.isDemoMode === true;
      setBots(isDemoMode ? (statusData as any)?.bots ?? [] : configData?.bots ?? []);
      setStatus(statusData);
      setToastMessage('Dashboard refreshed successfully!');
      setShowToast(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Fetch announcement
    apiService.get<{ announcement?: string }>('/api/dashboard/announcement')
      .then((data: any) => { if (data?.announcement) setAnnouncement(data.announcement); })
      .catch(() => { /* no announcement */ });
  }, [fetchData]);

  const handleRatingChange = useCallback((botName: string, rating: number) => {
    setBotRatings((prev) => ({ ...prev, [botName]: rating }));
    setToastMessage(`Rated ${botName}: ${rating} stars`);
    setShowToast(true);
  }, []);

  // ⚡ Bolt Optimization: Combined multiple O(N) filtering and reduce passes into a single pass.
  const { activeBots, totalMessages, uptimeHours, uptimeMinutes } = useMemo(() => {
    if (!status) {
      return { activeBots: 0, totalMessages: 0, uptimeHours: 0, uptimeMinutes: 0 };
    }

    let activeCount = 0;
    let messageSum = 0;

    if (status.bots) {
      for (let i = 0; i < status.bots.length; i++) {
        const bot = status.bots[i];
        if (bot.status === 'active') {
          activeCount++;
        }
        messageSum += (bot.messageCount || 0);
      }
    }

    return {
      activeBots: activeCount,
      totalMessages: messageSum,
      uptimeHours: Math.floor((status.uptime ?? 0) / 3600),
      uptimeMinutes: Math.floor(((status.uptime ?? 0) % 3600) / 60),
    };
  }, [status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200">
        {/* Hero Section Skeleton */}
        <div className="min-h-[60vh] bg-base-300 flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="skeleton h-12 w-80 rounded"></div>
            <div className="skeleton h-6 w-64 rounded"></div>

            {/* Stats Overview Skeleton */}
            <Stats className="shadow-lg bg-base-100/90 backdrop-blur">
              <Stat className="place-items-center">
                <div className="skeleton h-6 w-20 rounded mb-2"></div>
                <div className="skeleton h-8 w-12 rounded mb-2"></div>
                <div className="skeleton h-4 w-24 rounded"></div>
              </Stat>
              <Stat className="place-items-center">
                <div className="skeleton h-6 w-24 rounded mb-2"></div>
                <div className="skeleton h-8 w-16 rounded mb-2"></div>
                <div className="skeleton h-4 w-20 rounded"></div>
              </Stat>
              <Stat className="place-items-center">
                <div className="skeleton h-6 w-20 rounded mb-2"></div>
                <div className="skeleton h-8 w-14 rounded mb-2"></div>
                <div className="skeleton h-4 w-28 rounded"></div>
              </Stat>
            </Stats>

            <div className="skeleton h-12 w-48 rounded"></div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="px-2 py-2">
          {/* Quick Actions Skeleton */}
          <div className="skeleton h-12 w-full rounded-xl mb-4"></div>

          {/* Bot Cards Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>

          {/* System Status Footer Skeleton */}
          <div className="bg-base-100 rounded-lg shadow p-6">
            <div className="skeleton h-8 w-48 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Stat>
                <div className="skeleton h-4 w-12 rounded mb-2"></div>
                <div className="skeleton h-6 w-16 rounded mb-2"></div>
                <div className="skeleton h-3 w-32 rounded"></div>
              </Stat>
              <Stat>
                <div className="skeleton h-4 w-16 rounded mb-2"></div>
                <div className="skeleton h-6 w-12 rounded mb-2"></div>
                <div className="skeleton h-3 w-28 rounded"></div>
              </Stat>
              <Stat>
                <div className="skeleton h-4 w-20 rounded mb-2"></div>
                <div className="skeleton h-6 w-18 rounded mb-2"></div>
                <div className="skeleton h-3 w-30 rounded"></div>
              </Stat>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert status="error" message={error} />
          <div className="mt-4 text-center">
            <Button variant="primary" onClick={fetchData}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Toast Notification */}
      {showToast && (
        <div className="toast toast-bottom toast-center z-50" role="status" aria-live="polite">
          <Alert status="success" onClose={() => setShowToast(false)}>
            <span>{toastMessage}</span>
          </Alert>
        </div>
      )}

      {/* Quick Actions — flush to top, full width */}
      <QuickActions onRefresh={fetchData} />

      <div className="px-2 mb-2">
        {/* Getting Started Carousel — full width */}
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/40 mb-1">Getting Started</h3>
          <Carousel
            items={[
              { image: '', title: '🤖 Configure Your First Bot', description: 'Set up an AI agent with a persona and LLM provider.', bgGradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)', link: '/admin/bots' },
              { image: '', title: '🧠 Connect an LLM Provider', description: 'Add your OpenAI, Anthropic, or Ollama API key.', bgGradient: 'linear-gradient(135deg, #059669, #10b981)', link: '/admin/providers/llm' },
              { image: '', title: '🎭 Create a Persona', description: 'Give your bot a unique personality and response behavior.', bgGradient: 'linear-gradient(135deg, #0891b2, #06b6d4)', link: '/admin/personas' },
              { image: '', title: '🛡️ Set Up Guard Profiles', description: 'Add safety rules for access control and rate limiting.', bgGradient: 'linear-gradient(135deg, #d97706, #f59e0b)', link: '/admin/guards' },
              { image: '', title: '📊 Real-time Monitoring', description: 'Monitor performance, messages, and system health.', bgGradient: 'linear-gradient(135deg, #7c3aed, #a855f7)', link: '/admin/monitoring' },
              ...(announcement ? [{ image: '', title: '📋 Announcements', description: announcement, bgGradient: 'linear-gradient(135deg, #1e40af, #3b82f6)' }] : []),
            ]}
            autoplay
            interval={6000}
            variant="full-width"
            visibleCount={isWide ? 3 : isDesktop ? 2 : 1}
            onSlideClick={(item) => item.link && navigate(item.link)}
          />
        </div>

        {/* Stats Overview — full width below carousel */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/40 mb-1">Overview</h3>
          <Stats className="shadow-sm bg-base-200/50 w-full">
            <Stat title="Active Bots" value={activeBots} valueClassName="text-primary text-xl" description={`out of ${bots.length} total`} />
            <Stat title="Total Messages" value={totalMessages.toLocaleString()} valueClassName="text-secondary text-xl" description="processed today" />
            <Stat title="System Uptime" value={<>{uptimeHours}h {uptimeMinutes}m</>} valueClassName="text-accent text-xl" description="running smoothly" />
          </Stats>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-2 py-2">
        <TipRotator className="mb-4 px-2" />

        {/* Bot Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {bots.map((bot) => (
            <DashboardBotCard
              key={bot.name}
              bot={bot}
              botStatusData={status?.bots?.find((b) => b.id === bot.id)}
              rating={botRatings[bot.name] || 0}
              onRatingChange={handleRatingChange}
              getProviderIcon={getProviderIcon}
              getStatusColor={getStatusColor}
            />
          ))}
        </div>

        {/* Agent Grid */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Agents</h3>
          <AgentGrid />
        </div>

        {/* System Status Footer */}
        {status && (
          <Card title="🖥️ System Information">
            <Stats className="w-full shadow-sm bg-base-200/50">
              <Stat
                title="Active Bots"
                value={`${activeBots}/${bots.length}`}
                description="currently active"
                valueClassName="text-lg"
                figure={
                  <RadialProgress
                    value={bots.length > 0 ? Math.round((activeBots / bots.length) * 100) : 0}
                    size="3rem"
                    thickness="0.25rem"
                    color={activeBots === bots.length ? 'success' : activeBots > 0 ? 'warning' : 'error'}
                    className="text-[0.65rem] font-bold"
                  >
                    {bots.length > 0 ? Math.round((activeBots / bots.length) * 100) : 0}%
                  </RadialProgress>
                }
              />
              <Stat
                title="System Uptime"
                value={<>{uptimeHours}h {uptimeMinutes}m</>}
                description="System running smoothly"
                valueClassName="text-lg"
              />
              <Stat
                title="Message Volume"
                value={totalMessages.toLocaleString()}
                description="processed successfully"
                valueClassName="text-lg"
              />
            </Stats>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
