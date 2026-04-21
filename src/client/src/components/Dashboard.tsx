import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService, type Bot, type StatusResponse } from '../services/api';
import { Alert } from './DaisyUI/Alert';
import Button from './DaisyUI/Button';
import Card from './DaisyUI/Card';
import Hero from './DaisyUI/Hero';
import RadialProgress from './DaisyUI/RadialProgress';
import { SkeletonCard } from './DaisyUI/Skeleton';
import { Stat, Stats } from './DaisyUI/Stat';
import DashboardBotCard from './DashboardBotCard';
import AgentGrid from './Dashboard/AgentGrid';
import CommandCenterStream from './Monitoring/CommandCenterStream';
import { useSuccessToast, useErrorToast } from './DaisyUI/ToastNotification';
import { ArrowUp, ArrowDown, Save, Settings2 } from 'lucide-react';

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
  const [bots, setBots] = useState<Bot[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [botRatings, setBotRatings] = useState<Record<string, number>>({});
  
  // Dashboard Customization State
  const [layout, setLayout] = useState<string[]>(['stats', 'agents', 'command-stream']);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);

  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  const fetchLayout = useCallback(async () => {
    try {
      const response: any = await apiService.get('/api/webui/config');
      if (response.success && response.data?.layout) {
        setLayout(response.data.layout);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard layout', e);
    }
  }, []);

  useEffect(() => {
    fetchLayout();
  }, [fetchLayout]);

  const saveLayout = async () => {
    setSavingLayout(true);
    try {
      await apiService.post('/api/webui/config', { layout });
      successToast('Dashboard Layout Saved', 'Your custom widget order has been persisted.');
      setIsCustomizing(false);
    } catch (e: any) {
      errorToast('Failed to Save Layout', e.message || 'Error occurred');
    } finally {
      setSavingLayout(false);
    }
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const newLayout = [...layout];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLayout.length) return;

    [newLayout[index], newLayout[targetIndex]] = [newLayout[targetIndex], newLayout[index]];
    setLayout(newLayout);
  };
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
  }, [fetchData]);

  const handleRatingChange = useCallback((botName: string, rating: number) => {
    setBotRatings((prev) => ({ ...prev, [botName]: rating }));
    setToastMessage(`Rated ${botName}: ${rating} stars`);
    setShowToast(true);
  }, []);

  // ⚡ Bolt Optimization: Pre-compute bot status lookups to change O(N*M) render to O(N+M)
  const botStatusMap = useMemo(() => {
    const map = new Map<string, any>();
    if (status?.bots) {
      status.bots.forEach(b => map.set(b.id, b));
    }
    return map;
  }, [status]);

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

  const renderWidget = (type: string, index: number) => {
    const controls = isCustomizing && (
      <div className="flex gap-1 mb-2">
         <Button size="xs" variant="ghost" onClick={() => moveWidget(index, 'up')} disabled={index === 0}><ArrowUp className="w-3 h-3" /></Button>
         <Button size="xs" variant="ghost" onClick={() => moveWidget(index, 'down')} disabled={index === layout.length - 1}><ArrowDown className="w-3 h-3" /></Button>
      </div>
    );

    switch (type) {
      case 'stats':
        return (
          <div key="stats" className="mb-8">
            {controls}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat title="Total Bots" value={totalBots} icon="🤖" />
              <Stat title="Active" value={activeBots} icon="🟢" />
              <Stat title="Providers" value={totalProviders} icon="📡" />
              <Stat title="Message Volume" value={totalMessages.toLocaleString()} valueClassName="text-lg" description="processed successfully" />
            </div>
          </div>
        );
      case 'agents':
        return (
          <div key="agents" className="mb-8">
            {controls}
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-xl font-bold flex items-center gap-2">
                  Agents
                  {!isCustomizing && <Badge variant="primary" size="sm">{bots.length}</Badge>}
               </h3>
            </div>
            
            {/* Bot Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {bots.map((bot) => (
                <DashboardBotCard
                  key={bot.name}
                  bot={bot}
                  botStatusData={botStatusMap.get(bot.id)}
                  rating={botRatings[bot.name] || 0}
                  onRatingChange={handleRatingChange}
                  getProviderIcon={getProviderIcon}
                  getStatusColor={getStatusColor}
                />
              ))}
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4">Management Grid</h3>
              <AgentGrid />
            </div>
          </div>
        );
      case 'command-stream':
        return (
          <div key="command-stream" className="mb-8">
            {controls}
            <CommandCenterStream />
          </div>
        );
      default:
        return null;
    }
  };

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

      {/* Header */}
      <div className="p-6 bg-base-100 border-b border-base-300 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
         <div>
            <h1 className="text-4xl font-black tracking-tight text-base-content mb-1">
               Hivemind Dashboard
            </h1>
            <p className="text-sm opacity-50 uppercase tracking-widest font-bold">
               Autonomous Multi-Agent System
            </p>
         </div>

         <div className="flex gap-2">
            {isCustomizing ? (
               <>
                  <Button variant="ghost" onClick={() => { setIsCustomizing(false); fetchLayout(); }}>Cancel</Button>
                  <Button variant="primary" className="gap-2" onClick={saveLayout} loading={savingLayout}>
                     <Save className="w-4 h-4" /> Save Layout
                  </Button>
               </>
            ) : (
               <Button variant="ghost" size="sm" className="gap-2 opacity-50 hover:opacity-100" onClick={() => setIsCustomizing(true)}>
                  <Settings2 className="w-4 h-4" /> Customize
               </Button>
            )}
            <Button
               variant="primary"
               onClick={fetchData}
               disabled={loading}
               className="flex items-center gap-2"
            >
               <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
               Refresh
            </Button>
         </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8 max-w-7xl mx-auto">
        {layout.map((widgetType, index) => renderWidget(widgetType, index))}

        {/* System Status Footer */}
        {status && (
          <Card title="🖥️ System Information" className="bg-base-100 border border-base-300 mt-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Stat title="Uptime" value={<>{uptimeHours}h {uptimeMinutes}m</>} valueClassName="text-lg" description="System running smoothly" />
              <Stat title="Environment" value={status.environment.toUpperCase()} valueClassName="text-lg" description="Mode" />
              <Stat title="Version" value={status.version} valueClassName="text-lg" description="Current build" />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
