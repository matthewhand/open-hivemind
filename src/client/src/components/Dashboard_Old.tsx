import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
} from '@mui/material';
import { LoadingSpinner } from './DaisyUI/Loading';
import { 
  Alert, 
  Badge, 
  Card, 
  Rating, 
  Hero, 
  StatsCards, 
  Button, 
  Timeline,
  Carousel,
  Modal,
  ToastNotification 
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

  const fetchData = async () => {
    try {
      setError(null);
      const [configData, statusData] = await Promise.all([
        apiService.getConfig(),
        apiService.getStatus(),
      ]);
      setBots(configData.bots);
      setStatus(statusData);
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
        return 'default';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'discord':
        return '🤖';
      case 'slack':
        return '💬';
      case 'mattermost':
        return '📱';
      default:
        return '🔧';
    }
  };

  const handleRatingChange = (botName: string, rating: number) => {
    setBotRatings(prev => ({
      ...prev,
      [botName]: rating
    }));
    // Here you could also make an API call to save the rating
    console.log(`Rating for ${botName}: ${rating}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LoadingSpinner size="lg" />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert status="error" message={error} />
      </Container>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Hero Section */}
      <Hero 
        title="🧠 Open-Hivemind Dashboard"
        subtitle="Your AI Agent Swarm Control Center"
        backgroundImage="https://images.unsplash.com/photo-1555949963-aa79dcee981c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80"
        className="min-h-[60vh]"
      >
        <div className="flex flex-col items-center space-y-4">
          <Button variant="primary" size="lg" onClick={fetchData}>
            🔄 Refresh Dashboard
          </Button>
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">Active Bots</div>
              <div className="stat-value text-primary">{bots.filter(bot => 
                status?.bots.find((_, i) => bots[i]?.name === bot.name)?.status === 'active'
              ).length}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Total Messages</div>
              <div className="stat-value text-secondary">
                {status?.bots.reduce((sum, bot) => sum + (bot.messageCount || 0), 0) || 0}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title">System Uptime</div>
              <div className="stat-value text-accent">
                {status ? `${Math.floor(status.uptime / 3600)}h ${Math.floor((status.uptime % 3600) / 60)}m` : '0h 0m'}
              </div>
            </div>
          </div>
        </div>
      </Hero>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Quick Actions */}
        <div className="mb-8">
          <QuickActions onRefresh={fetchData} />
        </div>

        {/* Bot Cards in a Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {bots.map((bot, index) => {
          const botStatusData = status?.bots[index];
          const botStatus = botStatusData?.status || 'unknown';
          const healthDetails = botStatusData?.healthDetails;
          const connected = botStatusData?.connected ?? undefined;
          const messageCount = botStatusData?.messageCount ?? undefined;
          const errorCount = botStatusData?.errorCount ?? undefined;

          return (
            <Box key={bot.name} sx={{ minWidth: 300, flex: '1 1 auto' }}>
              <Card className="p-6">
                  <Box display="flex" alignItems="center" mb={2}>
                    <span className="text-xl font-semibold mr-2">
                      {getProviderIcon(bot.messageProvider)}
                    </span>
                    <h2 className="text-xl font-semibold">
                      {bot.name}
                    </h2>
                  </Box>

                  <Box mb={2} className="flex flex-wrap gap-2">
                    <Badge
                      variant="neutral"
                      size="small"
                    >
                      Provider: {bot.messageProvider}
                    </Badge>
                    <Badge
                      variant="neutral"
                      size="small"
                    >
                      LLM: {bot.llmProvider}
                    </Badge>
                  </Box>

                  <Box display="flex" alignItems="center" mb={1}>
                    <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                      Status:
                    </Typography>
                    <Badge
                      variant={getStatusColor(botStatus) === 'success' ? 'success' : 
                              getStatusColor(botStatus) === 'warning' ? 'warning' : 
                              getStatusColor(botStatus) === 'error' ? 'error' : 'neutral'}
                      size="small"
                    >
                      {botStatus}
                    </Badge>
                  </Box>

                  <Box display="flex" alignItems="center" gap={1} mb={1} className="flex-wrap">
                    {typeof connected === 'boolean' && (
                      <Badge
                        variant={connected ? 'success' : 'warning'}
                        size="small"
                      >
                        {connected ? 'Connected' : 'Disconnected'}
                      </Badge>
                    )}
                    {typeof messageCount === 'number' && (
                      <Badge
                        variant="neutral"
                        size="small"
                      >
                        Messages: {messageCount}
                      </Badge>
                    )}
                    {typeof errorCount === 'number' && errorCount > 0 && (
                      <Badge
                        variant="error"
                        size="small"
                      >
                        Errors: {errorCount}
                      </Badge>
                    )}
                  </Box>

                  {healthDetails && Object.keys(healthDetails).length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Details:
                      </Typography>
                      {healthDetails.guilds && (
                        <Typography variant="caption" display="block">
                          Guilds: {healthDetails.guilds}
                        </Typography>
                      )}
                      {healthDetails.team && (
                        <Typography variant="caption" display="block">
                          Team: {healthDetails.team}
                        </Typography>
                      )}
                      {healthDetails.error && (
                        <Typography variant="caption" display="block" color="error">
                          Error: {healthDetails.error}
                        </Typography>
                      )}
                    </Box>
                  )}

                  <Box mt={2} pt={2} borderTop="1px solid #e2e8f0">
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Rate this agent's performance:
                    </Typography>
                    <Rating
                      value={botRatings[bot.name] || 0}
                      onChange={(rating) => handleRatingChange(bot.name, rating)}
                      size="sm"
                      aria-label={`Rate ${bot.name} agent performance`}
                    />
                  </Box>
              </Card>
            </Box>
          );
        })}
      </Box>

      {status && (
        <Box mt={4}>
          <h3 className="text-lg font-semibold mb-2">
            System Status
          </h3>
          <p className="text-sm text-base-content/70">
            Uptime: {Math.floor(status.uptime / 3600)}h {Math.floor((status.uptime % 3600) / 60)}m
          </p>
        </Box>
      )}
    </Container>
  );
};

export default Dashboard;
