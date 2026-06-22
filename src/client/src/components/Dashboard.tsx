import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService, type StatusResponse } from '../services/api';
import type { BotConfig } from '../types/bot';
import { Alert } from './DaisyUI/Alert';
import Button from './DaisyUI/Button';
import Card from './DaisyUI/Card';
import Hero from './DaisyUI/Hero';
import RadialProgress from './DaisyUI/RadialProgress';
import { SkeletonCard } from './DaisyUI/Skeleton';
import { Stat, Stats } from './DaisyUI/Stat';
import Badge from './DaisyUI/Badge';
import DashboardBotCard from './DashboardBotCard';
import AgentGrid from './Dashboard/AgentGrid';
import CommandCenterStream from './Monitoring/CommandCenterStream';
import { useSuccessToast, useErrorToast } from './DaisyUI/ToastNotification';
import { ArrowUp, ArrowDown, RefreshCw, Save, Settings2, Plus, Bot as BotIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const getStatusColor = useCallback((botStatus: string) => {
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
  }, []);

  const getProviderIcon = useCallback((provider: string) => {
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
  }, []);
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [llmProfiles, setLlmProfiles] = useState<any[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [healthData, setHealthData] = useState<any>(null);
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
      // Non-fatal: the dashboard renders with the default layout.
      console.warn('Failed to fetch dashboard layout', e);
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

  const isMounted = React.useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      if (isMounted.current) setError(null);
      const [botsResult, statusResult, healthResult, profilesResult] = await Promise.allSettled([
        apiService.getBots(),
        apiService.getStatus(),
        apiService.get('/api/health'),
        apiService.getLlmProfiles(),
      ]);

      if (!isMounted.current) return;

      const statusData = statusResult.status === 'fulfilled' ? statusResult.value : { bots: [] };
      const healthPayload = healthResult.status === 'fulfilled' ? healthResult.value : null;

      // Read the same source as the Bots page (/api/bots) so the hero stats
      // and the Agents panel never disagree with the bot list elsewhere.
      const rawBots: any = botsResult.status === 'fulfilled' ? botsResult.value : null;
      const botsList: BotConfig[] = Array.isArray(rawBots) ? rawBots
        : Array.isArray(rawBots?.data) ? rawBots.data
        : rawBots?.data?.bots ?? rawBots?.bots ?? [];

      // Fall back to status bots only when /api/bots yields nothing
      // (e.g. older servers); normalize the shape the cards expect.
      const fallbackBots: BotConfig[] = (statusData?.bots ?? []).map((b: any) => ({
        ...b,
        id: b.id ?? b.name,
        messageProvider: b.messageProvider ?? b.provider ?? '',
      }));
      setBots(botsList.length > 0 ? botsList : fallbackBots);

      // Providers stat reads the same LLM profile list as the Bots page.
      const profilesData: any = profilesResult.status === 'fulfilled' ? profilesResult.value : null;
      const profiles = profilesData?.llm || profilesData?.profiles?.llm || [];
      setLlmProfiles(Array.isArray(profiles) ? profiles : []);
      setStatus(statusData);
      setHealthData(healthPayload);
      setToastMessage('Dashboard refreshed successfully!');
      setShowToast(true);
    } catch (err) {
      if (isMounted.current) setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      if (isMounted.current) setLoading(false);
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
  // Stats derive from the same /api/bots + llm-profiles data the Bots page
  // shows, so the hero never contradicts the rest of the admin UI.
  const { activeBots, totalMessages, uptimeSeconds, uptimeDays, uptimeHours, uptimeMinutes, totalProviders } = useMemo(() => {
    let activeCount = 0;
    let messageSum = 0;
    const providerSet = new Set<string>();

    for (const bot of bots) {
      const botStatus = (bot.status || '').toLowerCase();
      if (botStatus === 'active' || botStatus === 'running' || bot.connected) {
        activeCount++;
      }
      messageSum += (bot.messageCount || 0);
      const messageProvider = bot.messageProvider || bot.provider;
      if (messageProvider) providerSet.add(messageProvider.toLowerCase());
      if (bot.llmProvider) providerSet.add(bot.llmProvider.toLowerCase());
    }

    for (const profile of llmProfiles) {
      const key = profile?.provider || profile?.key || profile?.name;
      if (key) providerSet.add(String(key).toLowerCase());
    }

    const totalSeconds = healthData?.uptime ?? status?.uptime ?? 0;
    return {
      activeBots: activeCount,
      totalMessages: messageSum,
      uptimeSeconds: totalSeconds,
      uptimeDays: Math.floor(totalSeconds / 86400),
      uptimeHours: Math.floor((totalSeconds % 86400) / 3600),
      uptimeMinutes: Math.floor((totalSeconds % 3600) / 60),
      totalProviders: providerSet.size,
    };
  }, [bots, llmProfiles, status, healthData]);

  const hasUptime = uptimeSeconds > 0;
  const uptimeDisplay = uptimeDays > 0
    ? `${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m`
    : `${uptimeHours}h ${uptimeMinutes}m`;

  const rawEnvironment = typeof status?.environment === 'string' ? status.environment.trim() : '';
  const hasEnvironment = rawEnvironment.length > 0;
  const environmentDisplay = hasEnvironment
    ? rawEnvironment.charAt(0).toUpperCase() + rawEnvironment.slice(1).toLowerCase()
    : '—';

  const versionSource = (typeof healthData?.version === 'string' && healthData.version.trim().length > 0)
    ? healthData.version
    : (typeof status?.version === 'string' ? status.version : '');
  const rawVersion = typeof versionSource === 'string' ? versionSource.trim() : '';
  const hasVersion = rawVersion.length > 0;
  const versionDisplay = hasVersion ? `v${rawVersion}` : '—';

  const totalBots = bots.length;

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
         <Button size="xs" variant="ghost" aria-label={`Move ${type} widget up`} onClick={() => moveWidget(index, 'up')} disabled={index === 0}><ArrowUp className="w-3 h-3" /></Button>
         <Button size="xs" variant="ghost" aria-label={`Move ${type} widget down`} onClick={() => moveWidget(index, 'down')} disabled={index === layout.length - 1}><ArrowDown className="w-3 h-3" /></Button>
      </div>
    );

    switch (type) {
      case 'stats':
        return (
          <div key="stats" className="mb-8">
            {controls}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat
                title="Total Bots"
                value={totalBots}
                description={
                  totalBots === 0 ? (
                    <Link
                      to="/admin/bots/create"
                      className="text-sm text-base-content/60 hover:text-primary hover:underline"
                    >
                      No bots yet → Create your first
                    </Link>
                  ) : undefined
                }
              />
              <Stat
                title="Active"
                value={activeBots}
                description={
                  activeBots === 0
                    ? totalBots === 0
                      ? <span className="text-sm text-base-content/60">No bots yet</span>
                      : <span className="text-sm text-base-content/60">All bots offline</span>
                    : undefined
                }
              />
              <Stat
                title="Providers"
                value={totalProviders}
                description={
                  totalProviders === 0 ? (
                    <Link
                      to="/admin/llm"
                      className="text-sm text-base-content/60 hover:text-primary hover:underline"
                    >
                      No providers configured → Add one
                    </Link>
                  ) : undefined
                }
              />
              <Stat
                title="Message Volume"
                value={totalMessages.toLocaleString()}
                valueClassName="text-lg"
                description={
                  totalMessages === 0 ? (
                    <span className="text-sm text-base-content/60">No traffic yet</span>
                  ) : (
                    'processed successfully'
                  )
                }
              />
            </div>
          </div>
        );
      case 'agents':
        return (
          <div key="agents" className="mb-8">
            {controls}
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-xl font-bold flex items-center gap-2">
                  Agents
                  {!isCustomizing && bots.length > 0 && <Badge variant="primary" size="sm">{bots.length}</Badge>}
               </h2>
            </div>

            {bots.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-2xl border border-dashed border-base-content/20 bg-base-200/40 mb-8">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <BotIcon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold mb-1">No agents yet</h3>
                <p className="text-sm text-base-content/60 mb-5 max-w-sm">
                  Create your first bot to start seeing it here.
                </p>
                <Link
                  to="/admin/bots/create"
                  className="btn btn-primary btn-sm gap-2"
                  aria-label="Create a bot"
                >
                  <Plus className="w-4 h-4" />
                  Create a bot
                </Link>
              </div>
            ) : (
              <>
                {/* Bot Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {bots.map((bot) => (
                    <DashboardBotCard
                      key={bot.name}
                      bot={bot}
                      botStatusData={
                        botStatusMap.get(bot.id) ??
                        (bot.status
                          ? {
                              name: bot.name,
                              provider: bot.provider ?? bot.messageProvider ?? '',
                              llmProvider: bot.llmProvider ?? '',
                              status: bot.status,
                              connected: bot.connected,
                              messageCount: bot.messageCount,
                              errorCount: bot.errorCount,
                            }
                          : undefined)
                      }
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
              </>
            )}
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
            <p className="text-sm opacity-80 uppercase tracking-widest font-bold">
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
              <Stat
                title="Uptime"
                value={hasUptime ? uptimeDisplay : '—'}
                valueClassName="text-lg"
                description={hasUptime ? 'Since last restart' : 'Uptime unavailable'}
              />
              <Stat
                title="Environment"
                value={environmentDisplay}
                valueClassName="text-lg"
                description={hasEnvironment ? 'Runtime mode' : 'Environment unknown'}
              />
              <Stat
                title="Version"
                value={versionDisplay}
                valueClassName="text-lg"
                description={hasVersion ? 'App version' : 'Version unknown'}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
