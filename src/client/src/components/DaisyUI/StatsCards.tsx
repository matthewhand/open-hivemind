import React, { useEffect, useState } from 'react';

interface StatItem {
  id: string;
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: string;
  description?: string;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
}

interface StatsCardsProps {
  stats: StatItem[];
  isLoading?: boolean;
  className?: string;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats, isLoading = false, className = '' }) => {
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});

  // Animate numbers when they change
  useEffect(() => {
    stats.forEach(stat => {
      if (typeof stat.value === 'number') {
        const startValue = animatedValues[stat.id] || 0;
        const endValue = stat.value;
        const duration = 1000; // 1 second
        const steps = 60; // 60fps
        const increment = (endValue - startValue) / steps;
        
        let currentStep = 0;
        const timer = setInterval(() => {
          currentStep++;
          const currentValue = startValue + (increment * currentStep);
          
          setAnimatedValues(prev => ({
            ...prev,
            [stat.id]: currentStep >= steps ? endValue : currentValue
          }));
          
          if (currentStep >= steps) {
            clearInterval(timer);
          }
        }, duration / steps);
        
        return () => clearInterval(timer);
      }
    });
  }, [stats]);

  const getStatColor = (color?: string) => {
    switch (color) {
      case 'primary': return 'text-primary';
      case 'secondary': return 'text-secondary';
      case 'accent': return 'text-accent';
      case 'success': return 'text-success';
      case 'warning': return 'text-warning';
      case 'error': return 'text-error';
      case 'info': return 'text-info';
      default: return 'text-primary';
    }
  };

  const getChangeColor = (changeType?: string) => {
    switch (changeType) {
      case 'increase': return 'text-success';
      case 'decrease': return 'text-error';
      case 'neutral': return 'text-base-content/60';
      default: return 'text-base-content/60';
    }
  };

  const getChangeIcon = (changeType?: string) => {
    switch (changeType) {
      case 'increase': return '📈';
      case 'decrease': return '📉';
      case 'neutral': return '➡️';
      default: return '';
    }
  };

  const formatValue = (value: number | string, statId: string) => {
    if (typeof value === 'string') return value;
    
    const animatedValue = animatedValues[statId] || value;
    
    // Format large numbers
    if (animatedValue >= 1000000) {
      return `${(animatedValue / 1000000).toFixed(1)}M`;
    } else if (animatedValue >= 1000) {
      return `${(animatedValue / 1000).toFixed(1)}K`;
    }
    
    return Math.round(animatedValue).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="stats shadow">
            <div className="stat">
              <div className="stat-figure text-primary animate-pulse">
                <div className="w-8 h-8 bg-base-300 rounded"></div>
              </div>
              <div className="stat-title animate-pulse">
                <div className="h-4 bg-base-300 rounded w-24"></div>
              </div>
              <div className="stat-value animate-pulse">
                <div className="h-8 bg-base-300 rounded w-16"></div>
              </div>
              <div className="stat-desc animate-pulse">
                <div className="h-3 bg-base-300 rounded w-32"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {stats.map((stat) => (
        <div 
          key={stat.id} 
          className="stats shadow hover:shadow-lg transition-shadow duration-300 cursor-pointer hover:scale-105 transform transition-transform"
        >
          <div className="stat">
            <div className={`stat-figure ${getStatColor(stat.color)}`}>
              <span className="text-3xl">{stat.icon}</span>
            </div>
            
            <div className="stat-title text-base-content/60">
              {stat.title}
            </div>
            
            <div className={`stat-value ${getStatColor(stat.color)} text-2xl lg:text-3xl`}>
              {formatValue(stat.value, stat.id)}
            </div>
            
            <div className="stat-desc flex items-center gap-1">
              {stat.change !== undefined && (
                <>
                  <span className={getChangeColor(stat.changeType)}>
                    {getChangeIcon(stat.changeType)}
                    {Math.abs(stat.change)}%
                  </span>
                  <span className="text-base-content/40">vs last period</span>
                </>
              )}
              {stat.description && !stat.change && (
                <span className="text-base-content/60">{stat.description}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Hook for fetching real-time stats
export const useSystemStats = () => {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        
        // In a real implementation, this would fetch from your API
        // For now, we'll simulate with mock data
        const response = await fetch('/api/webui/system-status');
        const data = await response.json();
        
        const mockStats: StatItem[] = [
          {
            id: 'total-bots',
            title: 'Total Bots',
            value: data?.bots?.total || 12,
            change: 8.2,
            changeType: 'increase',
            icon: '🤖',
            color: 'primary',
          },
          {
            id: 'active-bots',
            title: 'Active Bots',
            value: data?.bots?.active || 8,
            change: 12.5,
            changeType: 'increase',
            icon: '✅',
            color: 'success',
          },
          {
            id: 'messages-today',
            title: 'Messages Today',
            value: data?.database?.stats?.totalMessages || 2847,
            change: -2.1,
            changeType: 'decrease',
            icon: '💬',
            color: 'info',
          },
          {
            id: 'uptime',
            title: 'System Uptime',
            value: '99.9%',
            change: 0.1,
            changeType: 'neutral',
            icon: '⏰',
            color: 'warning',
          },
          {
            id: 'mcp-servers',
            title: 'MCP Servers',
            value: data?.mcp?.connected || 5,
            description: 'Connected',
            icon: '🔧',
            color: 'secondary',
          },
          {
            id: 'response-time',
            title: 'Avg Response',
            value: '245ms',
            change: -15.3,
            changeType: 'increase', // Faster response time is good
            icon: '⚡',
            color: 'accent',
          },
          {
            id: 'memory-usage',
            title: 'Memory Usage',
            value: '68%',
            change: 3.2,
            changeType: 'increase',
            icon: '💾',
            color: 'warning',
          },
          {
            id: 'error-rate',
            title: 'Error Rate',
            value: '0.02%',
            change: -45.8,
            changeType: 'increase', // Lower error rate is good
            icon: '🚨',
            color: 'error',
          },
        ];
        
        setStats(mockStats);
        setError(null);
      } catch (err) {
        setError('Failed to fetch system stats');
        console.error('Error fetching stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return { stats, isLoading, error, refresh: () => setIsLoading(true) };
};

export default StatsCards;