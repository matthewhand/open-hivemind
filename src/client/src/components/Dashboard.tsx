import React, { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Card,
  Rating,
  Hero,
  Button,
  ToastNotification,
  SkeletonCard,
  SkeletonList,
  Dropdown,
  Tooltip
} from './DaisyUI';
import { apiService } from '../services/api';
import type { Bot, StatusResponse } from '../services/api';
import QuickActions from './QuickActions';

const Dashboard: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [botRatings, setBotRatings] = useState<Record<string, number>>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchData = async () => {
    try {
      setError(null);
      const [configData, statusData] = await Promise.all([
        apiService.getConfig(),
        apiService.getStatus(),
      ]);
      setBots(configData.bots);
      setStatus(statusData);
      setToastMessage('Dashboard refreshed successfully!');
      setShowToast(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleRatingChange = (botName: string, rating: number) => {
    setBotRatings(prev => ({ ...prev, [botName]: rating }));
    setToastMessage(`Rated ${botName}: ${rating} stars`);
    setShowToast(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200">
        {/* Hero Section Skeleton */}
        <div className="min-h-[60vh] bg-base-300 flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="skeleton h-12 w-80 rounded"></div>
            <div className="skeleton h-6 w-64 rounded"></div>

            {/* Stats Overview Skeleton */}
            <div className="stats shadow-lg bg-base-100/90 backdrop-blur">
              <div className="stat place-items-center">
                <div className="skeleton h-6 w-20 rounded mb-2"></div>
                <div className="skeleton h-8 w-12 rounded mb-2"></div>
                <div className="skeleton h-4 w-24 rounded"></div>
              </div>
              <div className="stat place-items-center">
                <div className="skeleton h-6 w-24 rounded mb-2"></div>
                <div className="skeleton h-8 w-16 rounded mb-2"></div>
                <div className="skeleton h-4 w-20 rounded"></div>
              </div>
              <div className="stat place-items-center">
                <div className="skeleton h-6 w-20 rounded mb-2"></div>
                <div className="skeleton h-8 w-14 rounded mb-2"></div>
                <div className="skeleton h-4 w-28 rounded"></div>
              </div>
            </div>

            <div className="skeleton h-12 w-48 rounded"></div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Quick Actions Skeleton */}
          <div className="mb-8">
            <div className="skeleton h-12 w-full rounded"></div>
          </div>

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
              <div className="stat">
                <div className="skeleton h-4 w-12 rounded mb-2"></div>
                <div className="skeleton h-6 w-16 rounded mb-2"></div>
                <div className="skeleton h-3 w-32 rounded"></div>
              </div>
              <div className="stat">
                <div className="skeleton h-4 w-16 rounded mb-2"></div>
                <div className="skeleton h-6 w-12 rounded mb-2"></div>
                <div className="skeleton h-3 w-28 rounded"></div>
              </div>
              <div className="stat">
                <div className="skeleton h-4 w-20 rounded mb-2"></div>
                <div className="skeleton h-6 w-18 rounded mb-2"></div>
                <div className="skeleton h-3 w-30 rounded"></div>
              </div>
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

  const activeBots = bots.filter(bot => 
    status?.bots.find((_, i) => bots[i]?.name === bot.name)?.status === 'active'
  ).length;

  const totalMessages = status?.bots.reduce((sum, bot) => sum + (bot.messageCount || 0), 0) || 0;
  const uptimeHours = status ? Math.floor(status.uptime / 3600) : 0;
  const uptimeMinutes = status ? Math.floor((status.uptime % 3600) / 60) : 0;

  return (
    <div className="min-h-screen bg-base-200">
      {/* Toast Notification */}
      {showToast && (
        <ToastNotification
          message={toastMessage}
          type="success"
          onClose={() => setShowToast(false)}
          duration={3000}
        />
      )}

      {/* Hero Section */}
      <Hero 
        title="🧠 Open-Hivemind Dashboard"
        subtitle="Your AI Agent Swarm Control Center"
        backgroundImage="https://images.unsplash.com/photo-1555949963-aa79dcee981c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80"
        className="min-h-[60vh]"
      >
        <div className="flex flex-col items-center space-y-6">
          <Button variant="primary" size="lg" onClick={fetchData}>
            🔄 Refresh Dashboard
          </Button>
          
          {/* Stats Overview */}
          <div className="stats shadow-lg bg-base-100/90 backdrop-blur">
            <div className="stat place-items-center">
              <div className="stat-title">Active Bots</div>
              <div className="stat-value text-primary text-2xl">{activeBots}</div>
              <div className="stat-desc">out of {bots.length} total</div>
            </div>
            <div className="stat place-items-center">
              <div className="stat-title">Total Messages</div>
              <div className="stat-value text-secondary text-2xl">{totalMessages.toLocaleString()}</div>
              <div className="stat-desc">processed today</div>
            </div>
            <div className="stat place-items-center">
              <div className="stat-title">System Uptime</div>
              <div className="stat-value text-accent text-2xl">{uptimeHours}h {uptimeMinutes}m</div>
              <div className="stat-desc">running smoothly</div>
            </div>
          </div>
        </div>
      </Hero>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <QuickActions onRefresh={fetchData} />
        </div>

        {/* Bot Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {bots.map((bot, index) => {
            const botStatusData = status?.bots[index];
            const botStatus = botStatusData?.status || 'unknown';
            const connected = botStatusData?.connected ?? false;
            const messageCount = botStatusData?.messageCount ?? 0;
            const errorCount = botStatusData?.errorCount ?? 0;

            return (
              <Card key={bot.name} className="shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="card-body">
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl">
                        {getProviderIcon(bot.messageProvider)}
                      </div>
                      <div>
                        <h2 className="card-title text-lg font-bold">
                          {bot.name}
                        </h2>
                        <p className="text-sm opacity-70">{bot.messageProvider}</p>
                      </div>
                    </div>
                    <Dropdown
                      trigger="⚙️"
                      position="bottom"
                      color="ghost"
                      size="sm"
                    >
                      <li><a>🔧 Configure</a></li>
                      <li><a>📊 View Logs</a></li>
                      <li><a>🔄 Restart</a></li>
                      <li><a>🔍 Debug</a></li>
                    </Dropdown>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Tooltip
                      content={`Bot is currently ${botStatus}. ${connected ? 'Connected and operational.' : 'Disconnected or having issues.'}`}
                      position="top"
                    >
                      <Badge
                        variant={getStatusColor(botStatus) === 'info' ? 'neutral' : getStatusColor(botStatus) as 'success' | 'warning' | 'error' | 'primary' | 'secondary' | 'neutral'}
                        className="text-xs font-semibold cursor-help"
                      >
                        {botStatus.toUpperCase()}
                      </Badge>
                    </Tooltip>
                    {bot.llmProvider && (
                      <Badge variant="secondary" className="text-xs">
                        🧠 {bot.llmProvider.toUpperCase()}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      📱 {bot.messageProvider.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Stats */}
                  <div className="stats stats-vertical lg:stats-horizontal shadow mb-4">
                    <div className="stat">
                      <div className="stat-figure text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                      </div>
                      <div className="stat-title">Messages</div>
                      <div className="stat-value text-primary">{messageCount.toLocaleString()}</div>
                      <div className="stat-desc">processed today</div>
                    </div>

                    <div className="stat">
                      <div className="stat-figure text-secondary">
                        <div className={`w-8 h-8 rounded-full ${connected ? 'bg-success' : 'bg-error'}`}></div>
                      </div>
                      <div className="stat-title">Connection</div>
                      <div className={`stat-value ${connected ? 'text-success' : 'text-error'}`}>
                        {connected ? 'Online' : 'Offline'}
                      </div>
                      <div className="stat-desc">{connected ? 'Connected' : 'Disconnected'}</div>
                    </div>
                  </div>

                  {errorCount > 0 && (
                    <div className="alert alert-error mb-4">
                      <span>⚠️ {errorCount} errors detected</span>
                    </div>
                  )}

                  {/* Rating */}
                  <div className="mb-4">
                    <p className="text-sm mb-2">Performance Rating:</p>
                    <Rating
                      value={botRatings[bot.name] || 0}
                      onChange={(rating) => handleRatingChange(bot.name, rating)}
                      size="sm"
                      aria-label={`Rate ${bot.name} agent performance`}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="card-actions justify-between">
                    <Button variant="ghost" size="sm">
                      📊 Analytics
                    </Button>
                    <Button variant="primary" size="sm">
                      💬 Interact
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* System Status Footer */}
        {status && (
          <div className="bg-base-100 rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              🖥️ System Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat">
                <div className="stat-title">Uptime</div>
                <div className="stat-value text-lg">{uptimeHours}h {uptimeMinutes}m</div>
                <div className="stat-desc">System running smoothly</div>
              </div>
              <div className="stat">
                <div className="stat-title">Total Bots</div>
                <div className="stat-value text-lg">{bots.length}</div>
                <div className="stat-desc">{activeBots} currently active</div>
              </div>
              <div className="stat">
                <div className="stat-title">Message Volume</div>
                <div className="stat-value text-lg">{totalMessages.toLocaleString()}</div>
                <div className="stat-desc">processed successfully</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;