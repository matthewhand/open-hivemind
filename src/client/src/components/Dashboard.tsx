/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Alert,
  Hero,
  Button,
  SkeletonCard,
} from './DaisyUI';
import { apiService } from '../services/api';
import type { Bot, StatusResponse } from '../services/api';
import QuickActions from './QuickActions';
import DashboardBotCard from './DashboardBotCard';

const Dashboard: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [botRatings, setBotRatings] = useState<Record<string, number>>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleRatingChange = useCallback((botName: string, rating: number) => {
    setBotRatings(prev => ({ ...prev, [botName]: rating }));
    setToastMessage(`Rated ${botName}: ${rating} stars`);
    setShowToast(true);
  }, []);

  const activeBots = useMemo(() => {
    if (!status?.bots) return 0;
    // status.bots aligns with bots array based on rendering logic.
    // Optimization: filtering directly on status array is O(N) vs O(N^2)
    return status.bots.filter(b => b.status === 'active').length;
  }, [status]);

  const totalMessages = useMemo(
    () => status?.bots.reduce((sum, bot) => sum + (bot.messageCount || 0), 0) || 0,
    [status]
  );
  const uptimeHours = useMemo(() => (status ? Math.floor(status.uptime / 3600) : 0), [status]);
  const uptimeMinutes = useMemo(() => (status ? Math.floor((status.uptime % 3600) / 60) : 0), [
    status,
  ]);

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

  return (
    <div className="min-h-screen bg-base-200">
      {/* Toast Notification */}
      {showToast && (
        <div className="toast toast-bottom toast-center z-50">
          <div className="alert alert-success">
            <span>{toastMessage}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setShowToast(false)}>✕</button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <Hero
        backgroundImage="https://images.unsplash.com/photo-1555949963-aa79dcee981c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80"
        className="min-h-[60vh]"
      >
        <div className="flex flex-col items-center space-y-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-4">
              🧠 Open-Hivemind Dashboard
            </h1>
            <p className="text-xl text-white/90 drop-shadow-md">
              Your AI Agent Swarm Control Center
            </p>
          </div>

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
          {bots.map((bot, index) => (
            <DashboardBotCard
              key={bot.name}
              bot={bot}
              botStatusData={status?.bots[index]}
              rating={botRatings[bot.name] || 0}
              onRatingChange={handleRatingChange}
              getProviderIcon={getProviderIcon}
              getStatusColor={getStatusColor}
            />
          ))}
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