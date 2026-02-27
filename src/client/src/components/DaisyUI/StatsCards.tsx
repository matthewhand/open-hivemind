/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-refresh/only-export-components, no-empty, no-case-declarations, @typescript-eslint/explicit-module-boundary-types */
import React, { useEffect, useRef } from 'react';
import {
  Bot, MessageCircle, CheckCircle, Clock, Server, Zap,
  HardDrive, AlertTriangle, TrendingUp, TrendingDown, Minus,
  Users, Activity, Settings, Database, Wifi,
} from 'lucide-react';

interface StatItem {
  id: string;
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: string | React.ReactNode;
  description?: string;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
}

interface StatsCardsProps {
  stats: StatItem[];
  isLoading?: boolean;
  className?: string;
}

// Icon mapping for string-based icons
const iconMap: Record<string, React.ReactNode> = {
  '🤖': <Bot className="w-8 h-8" />,
  'bot': <Bot className="w-8 h-8" />,
  '💬': <MessageCircle className="w-8 h-8" />,
  'message': <MessageCircle className="w-8 h-8" />,
  '✅': <CheckCircle className="w-8 h-8" />,
  'check': <CheckCircle className="w-8 h-8" />,
  '⏰': <Clock className="w-8 h-8" />,
  'clock': <Clock className="w-8 h-8" />,
  '🔧': <Server className="w-8 h-8" />,
  'server': <Server className="w-8 h-8" />,
  '⚡': <Zap className="w-8 h-8" />,
  'zap': <Zap className="w-8 h-8" />,
  '💾': <HardDrive className="w-8 h-8" />,
  'storage': <HardDrive className="w-8 h-8" />,
  '🚨': <AlertTriangle className="w-8 h-8" />,
  'alert': <AlertTriangle className="w-8 h-8" />,
  '👥': <Users className="w-8 h-8" />,
  'users': <Users className="w-8 h-8" />,
  '📊': <Activity className="w-8 h-8" />,
  'activity': <Activity className="w-8 h-8" />,
  '⚙️': <Settings className="w-8 h-8" />,
  'settings': <Settings className="w-8 h-8" />,
  '🗄️': <Database className="w-8 h-8" />,
  'database': <Database className="w-8 h-8" />,
  '📡': <Wifi className="w-8 h-8" />,
  'wifi': <Wifi className="w-8 h-8" />,
};

// Format number with K/M suffixes
const formatStatValue = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return Math.round(value).toLocaleString();
};

// Performance-optimized counter using Web Animations API
// Avoids React re-renders during animation by updating DOM directly via ref
const AnimatedCounter: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const startValueRef = useRef<number>(0);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    // Cancel any existing animation
    if (animationRef.current) {
      animationRef.current.cancel();
    }

    const startValue = startValueRef.current;
    const endValue = value;

    // Skip animation if values are the same
    if (startValue === endValue) {
      node.textContent = formatStatValue(endValue);
      return;
    }

    // Use Web Animations API for hardware-accelerated animation
    // This runs on the compositor thread without triggering React re-renders
    const keyframes: Keyframe[] = [
      { '--anim-value': startValue } as unknown as Keyframe,
      { '--anim-value': endValue } as unknown as Keyframe,
    ];

    animationRef.current = node.animate(keyframes, {
      duration: 1000,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards',
    });

    // Track animation progress and update text
    let rafId: number;
    const updateValue = () => {
      if (!animationRef.current) return;

      const effect = animationRef.current.effect as KeyframeEffect | null;
      if (effect) {
        const timing = effect.getComputedTiming();
        const progress = timing.progress ?? (timing.currentTime && timing.duration ? Number(timing.currentTime) / Number(timing.duration) : 1);
        const currentValue = startValue + (endValue - startValue) * progress;
        node.textContent = formatStatValue(currentValue);
      }

      if (animationRef.current.playState !== 'finished') {
        rafId = requestAnimationFrame(updateValue);
      } else {
        node.textContent = formatStatValue(endValue);
        startValueRef.current = endValue;
      }
    };

    rafId = requestAnimationFrame(updateValue);

    return () => {
      cancelAnimationFrame(rafId);
      if (animationRef.current) {
        animationRef.current.cancel();
      }
    };
  }, [value]);

  return <span ref={nodeRef} className={className}>{formatStatValue(startValueRef.current)}</span>;
};


const StatsCards: React.FC<StatsCardsProps> = ({ stats, isLoading = false, className = '' }) => {
  const getGradientBg = (color?: string) => {
    switch (color) {
    case 'primary': return 'bg-gradient-to-br from-primary/20 via-primary/10 to-transparent';
    case 'secondary': return 'bg-gradient-to-br from-secondary/20 via-secondary/10 to-transparent';
    case 'accent': return 'bg-gradient-to-br from-accent/20 via-accent/10 to-transparent';
    case 'success': return 'bg-gradient-to-br from-success/20 via-success/10 to-transparent';
    case 'warning': return 'bg-gradient-to-br from-warning/20 via-warning/10 to-transparent';
    case 'error': return 'bg-gradient-to-br from-error/20 via-error/10 to-transparent';
    case 'info': return 'bg-gradient-to-br from-info/20 via-info/10 to-transparent';
    default: return 'bg-gradient-to-br from-primary/20 via-primary/10 to-transparent';
    }
  };

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

  const getIconBg = (color?: string) => {
    switch (color) {
    case 'primary': return 'bg-primary/20';
    case 'secondary': return 'bg-secondary/20';
    case 'accent': return 'bg-accent/20';
    case 'success': return 'bg-success/20';
    case 'warning': return 'bg-warning/20';
    case 'error': return 'bg-error/20';
    case 'info': return 'bg-info/20';
    default: return 'bg-primary/20';
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
    case 'increase': return <TrendingUp className="w-4 h-4" />;
    case 'decrease': return <TrendingDown className="w-4 h-4" />;
    case 'neutral': return <Minus className="w-4 h-4" />;
    default: return null;
    }
  };

  const resolveIcon = (icon: string | React.ReactNode): React.ReactNode => {
    if (typeof icon === 'string') {
      return iconMap[icon] || <Activity className="w-8 h-8" />;
    }
    return icon;
  };

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card bg-base-200/50 backdrop-blur-sm border border-base-300/50">
            <div className="card-body p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-base-300 rounded w-24 animate-pulse" />
                  <div className="h-8 bg-base-300 rounded w-16 animate-pulse" />
                  <div className="h-3 bg-base-300 rounded w-32 animate-pulse" />
                </div>
                <div className="w-12 h-12 bg-base-300 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <div
          key={stat.id}
          className={`
            card border border-base-300/50 backdrop-blur-sm
            hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30
            transition-all duration-300 cursor-pointer
            hover:-translate-y-1 animate-fade-in
            ${getGradientBg(stat.color)}
          `}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="card-body p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium text-base-content/60 uppercase tracking-wide">
                  {stat.title}
                </p>

                {typeof stat.value === 'number' ? (
                  <AnimatedCounter
                    value={stat.value}
                    className={`text-3xl font-bold ${getStatColor(stat.color)}`}
                  />
                ) : (
                  <p className={`text-3xl font-bold ${getStatColor(stat.color)}`}>
                    {stat.value}
                  </p>
                )}

                {stat.change !== undefined && (
                  <div className={`flex items-center gap-1 text-sm ${getChangeColor(stat.changeType)}`}>
                    {getChangeIcon(stat.changeType)}
                    <span className="font-medium">{Math.abs(stat.change)}%</span>
                    <span className="text-base-content/40 text-xs">vs last period</span>
                  </div>
                )}

                {stat.description && !stat.change && (
                  <p className="text-sm text-base-content/60">{stat.description}</p>
                )}
              </div>

              <div className={`p-3 rounded-xl ${getIconBg(stat.color)} ${getStatColor(stat.color)}`}>
                {resolveIcon(stat.icon)}
              </div>
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

        const response = await fetch('/api/webui/system-status');
        const data = await response.json();

        const mockStats: StatItem[] = [
          {
            id: 'total-bots',
            title: 'Total Bots',
            value: data?.bots?.total || 12,
            change: 8.2,
            changeType: 'increase',
            icon: 'bot',
            color: 'primary',
          },
          {
            id: 'active-bots',
            title: 'Active Bots',
            value: data?.bots?.active || 8,
            change: 12.5,
            changeType: 'increase',
            icon: 'check',
            color: 'success',
          },
          {
            id: 'messages-today',
            title: 'Messages Today',
            value: data?.database?.stats?.totalMessages || 2847,
            change: -2.1,
            changeType: 'decrease',
            icon: 'message',
            color: 'info',
          },
          {
            id: 'uptime',
            title: 'System Uptime',
            value: '99.9%',
            change: 0.1,
            changeType: 'neutral',
            icon: 'clock',
            color: 'warning',
          },
          {
            id: 'mcp-servers',
            title: 'MCP Servers',
            value: data?.mcp?.connected || 5,
            description: 'Connected',
            icon: 'server',
            color: 'secondary',
          },
          {
            id: 'response-time',
            title: 'Avg Response',
            value: '245ms',
            change: -15.3,
            changeType: 'increase',
            icon: 'zap',
            color: 'accent',
          },
          {
            id: 'memory-usage',
            title: 'Memory Usage',
            value: '68%',
            change: 3.2,
            changeType: 'increase',
            icon: 'storage',
            color: 'warning',
          },
          {
            id: 'error-rate',
            title: 'Error Rate',
            value: '0.02%',
            change: -45.8,
            changeType: 'increase',
            icon: 'alert',
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

    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return { stats, isLoading, error, refresh: () => setIsLoading(true) };
};

export default StatsCards;
