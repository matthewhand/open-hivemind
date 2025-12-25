import React, { useEffect, useState } from 'react';
import {
  StatsCards,
  Badge,
  Button,
  DataTable,
  Timeline,
  ProgressBar,
  VisualFeedback,
  NavbarWithSearch,
  Tooltip,
  Card,
  Hero,
} from '../components/DaisyUI';
import { apiService } from '../services/api';
import type { Bot, StatusResponse } from '../services/api';

interface DashboardStats {
  totalBots: number;
  activeBots: number;
  totalMessages: number;
  totalErrors: number;
  uptime: number;
}

const EnhancedDashboard: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  // Sample timeline data (in a real app, this would come from an API)
  const [timelineEvents] = useState([
    {
      id: '1',
      title: 'Bot Connected',
      description: 'Discord bot successfully connected',
      timestamp: new Date(Date.now() - 300000).toISOString(), // 5 min ago
      type: 'success' as const,
    },
    {
      id: '2',
      title: 'Message Processed',
      description: 'Processed user query about weather',
      timestamp: new Date(Date.now() - 600000).toISOString(), // 10 min ago
      type: 'info' as const,
    },
    {
      id: '3',
      title: 'API Rate Limit',
      description: 'Approaching OpenAI API rate limit',
      timestamp: new Date(Date.now() - 900000).toISOString(), // 15 min ago
      type: 'warning' as const,
    },
  ]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.get<StatusResponse>('/api/dashboard/api/status');
      const { bots: botData, uptime } = response.data;

      setBots(botData);

      // Calculate stats
      const activeBots = botData.filter(bot => bot.status === 'active').length;
      const totalMessages = botData.reduce((sum, bot) => sum + (bot.messageCount || 0), 0);
      const totalErrors = botData.reduce((sum, bot) => sum + (bot.errorCount || 0), 0);

      setStats({
        totalBots: botData.length,
        activeBots,
        totalMessages,
        totalErrors,
        uptime: Math.round(uptime),
      });

      setLastUpdated(new Date());
      setToastMessage('Dashboard data refreshed successfully');
      setToastType('success');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setError(errorMessage);
      setToastMessage(errorMessage);
      setToastType('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // In a real app, this might trigger a search API call
    console.log('Searching for:', query);
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  // Filter bots based on search query
  const filteredBots = bots.filter(bot =>
    bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bot.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bot.llmProvider.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Transform bot data for DataTable
  const tableData = filteredBots.map(bot => ({
    id: bot.id,
    name: bot.name,
    status: bot.status,
    provider: bot.provider,
    llmProvider: bot.llmProvider,
    messageCount: bot.messageCount || 0,
    errorCount: bot.errorCount || 0,
    connected: bot.connected ? 'Yes' : 'No',
  }));

  const tableColumns = [
    { key: 'name', header: 'Bot Name' },
    { key: 'status', header: 'Status' },
    { key: 'provider', header: 'Message Provider' },
    { key: 'llmProvider', header: 'LLM Provider' },
    { key: 'messageCount', header: 'Messages' },
    { key: 'errorCount', header: 'Errors' },
    { key: 'connected', header: 'Connected' },
  ];

  if (isLoading && !stats) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Enhanced Navbar */}
      <NavbarWithSearch
        title="Open-Hivemind Dashboard"
        subtitle={lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : ''}
        onSearch={handleSearch}
        searchPlaceholder="Search bots, providers..."
        rightActions={
          <div className="flex items-center gap-2">
            {stats && (
              <>
                <Badge
                  variant={stats.activeBots === stats.totalBots ? 'success' : 'warning'}
                  text={`${stats.activeBots}/${stats.totalBots} Active`}
                />
                <Tooltip content="Refresh dashboard data" position="bottom">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleRefresh}
                    disabled={isLoading}
                  >
                    🔄
                  </button>
                </Tooltip>
              </>
            )}
          </div>
        }
      />

      {/* Hero Welcome Section */}
      <Hero
        variant="overlay"
        bgColor="bg-gradient-to-r from-primary to-secondary"
        title="Welcome to Open-Hivemind Dashboard"
        subtitle="Monitor and manage your AI agents across multiple platforms with real-time insights and comprehensive analytics."
        alignment="center"
        gradient={true}
        minHeight="lg"
        actions={
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="primary" size="lg" onClick={handleRefresh}>
              Refresh Dashboard
            </Button>
            <Button variant="secondary" className="btn-outline" size="lg" onClick={() => {
              setToastMessage('Feature coming soon!');
              setToastType('info');
            }}>
              Add New Bot
            </Button>
          </div>
        }
        data-testid="dashboard-hero"
      />

      <div className="container mx-auto p-6 space-y-6">

        {/* Error Display */}
        {error && (
          <VisualFeedback
            type="error"
            message={error}
            visible={true}
          />
        )}

        {/* Stats Cards */}
        {stats && (
          <StatsCards
            stats={[
              {
                title: 'Total Bots',
                value: stats.totalBots.toString(),
                icon: '🤖',
                trend: stats.activeBots === stats.totalBots ? '100% Active' : `${Math.round((stats.activeBots / stats.totalBots) * 100)}% Active`,
              },
              {
                title: 'Messages Today',
                value: stats.totalMessages.toLocaleString(),
                icon: '💬',
                trend: stats.totalMessages > 1000 ? 'High Volume' : 'Normal',
              },
              {
                title: 'System Uptime',
                value: `${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m`,
                icon: '⚡',
                trend: stats.uptime > 86400 ? '> 24h' : '< 24h',
              },
              {
                title: 'Total Errors',
                value: stats.totalErrors.toString(),
                icon: stats.totalErrors > 0 ? '⚠️' : '✅',
                trend: stats.totalErrors === 0 ? 'All Good' : 'Needs Attention',
              },
            ]}
          />
        )}

        {/* Performance Indicators */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card title="Bot Availability">
              <ProgressBar
                value={stats.activeBots}
                max={stats.totalBots}
                color={stats.activeBots === stats.totalBots ? 'success' : 'warning'}
                showPercentage={true}
                label={`${stats.activeBots} of ${stats.totalBots} bots active`}
              />
            </Card>

            <Card title="Error Rate">
              <ProgressBar
                value={stats.totalErrors}
                max={Math.max(stats.totalMessages / 10, 10)} // Error rate relative to messages
                color={stats.totalErrors === 0 ? 'success' : stats.totalErrors < 5 ? 'warning' : 'error'}
                showPercentage={false}
                label={stats.totalErrors === 0 ? 'No errors' : `${stats.totalErrors} errors`}
              />
            </Card>

            <Card title="Message Volume">
              <div className="stat-value text-2xl">{stats.totalMessages.toLocaleString()}</div>
              <div className="stat-desc">messages processed</div>
            </Card>

            <Card title="System Health">
              <div className="flex items-center gap-2">
                <div className={`badge ${stats.totalErrors === 0 ? 'badge-success' : 'badge-warning'}`}>
                  {stats.totalErrors === 0 ? 'Healthy' : 'Issues Detected'}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Bot Table - Takes up 2/3 of the space */}
          <div className="lg:col-span-2">
            <Card title="Bot Status" actions={
              <div className="flex gap-2">
                <Badge variant="info" text={`${filteredBots.length} bots`} />
                {searchQuery && (
                  <Badge variant="secondary" text={`Filtered: "${searchQuery}"`} />
                )}
              </div>
            }>
              {filteredBots.length > 0 ? (
                <DataTable
                  data={tableData}
                  columns={tableColumns}
                  className="w-full"
                  renderCell={(key, value, row) => {
                    if (key === 'status') {
                      return <Badge
                        variant={value === 'active' ? 'success' : 'error'}
                        text={value as string}
                      />;
                    }
                    if (key === 'connected') {
                      return <Badge
                        variant={value === 'Yes' ? 'success' : 'error'}
                        text={value as string}
                      />;
                    }
                    if (key === 'errorCount') {
                      const count = value as number;
                      return count > 0 ? (
                        <Badge variant="warning" text={count.toString()} />
                      ) : (
                        <Badge variant="success" text="0" />
                      );
                    }
                    return value;
                  }}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-base-content/60">
                    {searchQuery ? `No bots found matching "${searchQuery}"` : 'No bots available'}
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Timeline - Takes up 1/3 of the space */}
          <div className="lg:col-span-1">
            <Card title="Recent Activity">
              <Timeline events={timelineEvents} />
            </Card>
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Quick Actions">
            <div className="space-y-2">
              <Button variant="primary" size="sm" className="w-full" onClick={() => {
                setToastMessage('Feature coming soon!');
                setToastType('info');
              }}>
                Add New Bot
              </Button>
              <Button variant="secondary" size="sm" className="w-full" onClick={() => {
                setToastMessage('Settings opened!');
                setToastType('info');
              }}>
                Configuration
              </Button>
              <Button variant="accent" size="sm" className="w-full" onClick={handleRefresh}>
                Refresh Data
              </Button>
            </div>
          </Card>

          <Card title="System Information">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Environment:</span>
                <Badge variant="info" text="Development" />
              </div>
              <div className="flex justify-between">
                <span>Version:</span>
                <Badge variant="secondary" text="1.0.0" />
              </div>
              {stats && (
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <Badge variant="success" text={`${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m`} />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Toast Notifications */}
      {toastMessage && (
        <div className="toast toast-bottom toast-center z-50">
          <div className={`alert ${toastType === 'success' ? 'alert-success' : toastType === 'error' ? 'alert-error' : toastType === 'warning' ? 'alert-warning' : 'alert-info'}`}>
            <span>{toastMessage}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setToastMessage('')}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDashboard;