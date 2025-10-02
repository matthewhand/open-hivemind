import React, { useState, useEffect } from 'react';
import { 
  Hero, 
  StatsCards, 
  Card, 
  Button, 
  Grid, 
  DashboardWidgetSystem,
  Timeline,
  Alert,
  Badge,
  Loading,
  Avatar,
  Countdown,
  ProgressBar
} from '../components/DaisyUI';
import { useNavigate } from 'react-router-dom';

const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState({
    activeBots: 3,
    totalMessages: 1247,
    uptime: 72,
    memoryUsage: 64
  });

  useEffect(() => {
    // Simulate loading system data
    setTimeout(() => setLoading(false), 1500);
  }, []);

  const quickActions = [
    {
      title: 'Create Bot',
      description: 'Set up a new bot instance',
      icon: '🤖',
      action: () => navigate('/dashboard/bots/create'),
      color: 'btn-primary'
    },
    {
      title: 'Monitor Activity',
      description: 'View real-time system activity',
      icon: '📊',
      action: () => navigate('/dashboard/activity'),
      color: 'btn-secondary'
    },
    {
      title: 'Manage Personas',
      description: 'Configure AI personalities',
      icon: '🎭',
      action: () => navigate('/dashboard/personas'),
      color: 'btn-accent'
    },
    {
      title: 'System Settings',
      description: 'Configure platform settings',
      icon: '⚙️',
      action: () => navigate('/dashboard/settings'),
      color: 'btn-info'
    }
  ];

  const recentActivity = [
    {
      id: 1,
      title: 'Bot #1 came online',
      description: 'Discord integration active',
      time: '2 minutes ago',
      type: 'success'
    },
    {
      id: 2,
      title: 'New persona created',
      description: 'Developer Assistant persona configured',
      time: '15 minutes ago',
      type: 'info'
    },
    {
      id: 3,
      title: 'MCP server connected',
      description: 'GitHub integration established',
      time: '1 hour ago',
      type: 'success'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
        <span className="ml-4 text-lg">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <Hero
        title="Open-Hivemind Dashboard"
        subtitle="Multi-Agent AI Coordination Platform"
        variant="overlay"
        bgColor="bg-gradient-to-r from-primary to-secondary"
        alignment="center"
        minHeight="md"
        titleColor="text-white"
        subtitleColor="text-white/80"
        actions={
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/dashboard/bots/create')}
            >
              Create Bot
            </Button>
            <Button 
              variant="ghost" 
              size="lg"
              onClick={() => navigate('/dashboard/showcase')}
            >
              View Components
            </Button>
          </div>
        }
      />

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat bg-primary text-primary-content rounded-lg p-6">
          <div className="stat-figure text-primary-content">
            <Avatar size="lg" src="🤖" />
          </div>
          <div className="stat-title text-primary-content/80">Active Bots</div>
          <div className="stat-value">{systemStats.activeBots}</div>
          <div className="stat-desc text-primary-content/60">Currently running</div>
        </div>

        <div className="stat bg-secondary text-secondary-content rounded-lg p-6">
          <div className="stat-figure text-secondary-content">
            <div className="text-4xl">💬</div>
          </div>
          <div className="stat-title text-secondary-content/80">Messages</div>
          <div className="stat-value">{systemStats.totalMessages.toLocaleString()}</div>
          <div className="stat-desc text-secondary-content/60">Total processed</div>
        </div>

        <div className="stat bg-accent text-accent-content rounded-lg p-6">
          <div className="stat-figure text-accent-content">
            <div className="text-4xl">⏱️</div>
          </div>
          <div className="stat-title text-accent-content/80">Uptime</div>
          <div className="stat-value">{systemStats.uptime}h</div>
          <div className="stat-desc text-accent-content/60">System running</div>
        </div>

        <div className="stat bg-info text-info-content rounded-lg p-6">
          <div className="stat-figure text-info-content">
            <div className="radial-progress text-info-content" style={{"--value": systemStats.memoryUsage} as any}>
              {systemStats.memoryUsage}%
            </div>
          </div>
          <div className="stat-title text-info-content/80">Memory</div>
          <div className="stat-value">{systemStats.memoryUsage}%</div>
          <div className="stat-desc text-info-content/60">Usage</div>
        </div>
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions" className="bg-base-100 shadow-xl">
        <Grid cols={1} mdCols={2} lgCols={4} gap={4}>
          {quickActions.map((action, index) => (
            <Card 
              key={index}
              className="bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
              onClick={action.action}
            >
              <div className="text-center p-6">
                <div className="text-4xl mb-4">{action.icon}</div>
                <h3 className="text-lg font-bold mb-2">{action.title}</h3>
                <p className="text-sm text-base-content/70 mb-4">{action.description}</p>
                <Button variant="primary" size="sm" fullWidth>
                  {action.title}
                </Button>
              </div>
            </Card>
          ))}
        </Grid>
      </Card>

      {/* Dashboard Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card title="Recent Activity" className="h-full">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 bg-base-200 rounded-lg">
                  <Badge 
                    variant={activity.type === 'success' ? 'success' : 'info'} 
                    size="lg"
                  >
                    {activity.type === 'success' ? '✓' : 'ℹ'}
                  </Badge>
                  <div className="flex-1">
                    <h4 className="font-semibold">{activity.title}</h4>
                    <p className="text-sm text-base-content/70">{activity.description}</p>
                    <p className="text-xs text-base-content/50 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Button 
                variant="outline" 
                fullWidth
                onClick={() => navigate('/dashboard/activity')}
              >
                View All Activity
              </Button>
            </div>
          </Card>
        </div>

        {/* System Health */}
        <Card title="System Health" className="h-full">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">CPU Usage</span>
                <span className="text-sm text-base-content/70">34%</span>
              </div>
              <ProgressBar value={34} variant="success" />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Memory</span>
                <span className="text-sm text-base-content/70">{systemStats.memoryUsage}%</span>
              </div>
              <ProgressBar value={systemStats.memoryUsage} variant="warning" />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Network</span>
                <span className="text-sm text-base-content/70">12%</span>
              </div>
              <ProgressBar value={12} variant="info" />
            </div>

            <Alert status="success" className="mt-4">
              <span>🟢 All systems operational</span>
            </Alert>

            <Button 
              variant="outline" 
              fullWidth
              onClick={() => navigate('/monitor')}
            >
              Detailed Monitoring
            </Button>
          </div>
        </Card>
      </div>

      {/* Next Maintenance */}
      <Card title="Upcoming Maintenance" className="bg-warning/10 border-warning">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Scheduled System Update</h4>
            <p className="text-sm text-base-content/70">Next maintenance window in:</p>
          </div>
          <Countdown 
            targetDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)} 
            format="dhms"
            size="lg"
          />
        </div>
      </Card>
    </div>
  );
};

export default OverviewPage;