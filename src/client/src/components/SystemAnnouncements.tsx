import React, { useState, useEffect } from 'react';

interface SystemAnnouncement {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  command?: string;
}

interface SystemAnnouncementsProps {
  className?: string;
  maxHeight?: string;
  showCommands?: boolean;
  realTime?: boolean;
}

const SystemAnnouncements: React.FC<SystemAnnouncementsProps> = ({
  className = '',
  maxHeight = 'max-h-64',
  showCommands = true,
  realTime = true
}) => {
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([
    {
      id: '1',
      type: 'success',
      message: 'Bot Manager: 3 active instances running',
      timestamp: new Date(Date.now() - 30000),
      command: 'hivemind status --bots'
    },
    {
      id: '2', 
      type: 'info',
      message: 'LLM Providers: OpenAI, Anthropic online',
      timestamp: new Date(Date.now() - 25000),
      command: 'hivemind check --providers'
    },
    {
      id: '3',
      type: 'warning',
      message: 'Rate limit approaching: 85% of daily quota used',
      timestamp: new Date(Date.now() - 15000),
      command: 'hivemind quota --check'
    },
    {
      id: '4',
      type: 'success',
      message: 'Memory optimization completed: 2.1GB freed',
      timestamp: new Date(Date.now() - 10000),
      command: 'hivemind memory --optimize'
    },
    {
      id: '5',
      type: 'info',
      message: 'New bot "Assistant-Pro" deployed successfully',
      timestamp: new Date(Date.now() - 5000),
      command: 'hivemind deploy --bot assistant-pro'
    }
  ]);

  const [isLive, setIsLive] = useState(realTime);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      // Simulate new announcements
      const newAnnouncements = [
        'Health check: All systems operational',
        'WebSocket connections: 47 active clients',
        'Database sync completed successfully',
        'Cache cleared: Performance improved',
        'Backup created: config-backup-' + Date.now(),
        'Security scan: No threats detected'
      ];

      const randomMessage = newAnnouncements[Math.floor(Math.random() * newAnnouncements.length)];
      const types: ('info' | 'success' | 'warning')[] = ['info', 'success', 'warning'];
      const randomType = types[Math.floor(Math.random() * types.length)];

      const newAnnouncement: SystemAnnouncement = {
        id: Date.now().toString(),
        type: randomType,
        message: randomMessage,
        timestamp: new Date(),
        command: 'hivemind monitor --live'
      };

      setAnnouncements(prev => [newAnnouncement, ...prev.slice(0, 9)]); // Keep last 10
    }, 8000); // New announcement every 8 seconds

    return () => clearInterval(interval);
  }, [isLive]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-success';
      case 'warning': return 'text-warning';
      case 'error': return 'text-error';
      case 'info': return 'text-info';
      default: return 'text-base-content';
    }
  };

  const getTypePrefix = (type: string) => {
    switch (type) {
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'error': return '✗';
      case 'info': return '>';
      default: return '>';
    }
  };

  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="card-header px-6 py-4 border-b border-base-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🖥️</div>
            <div>
              <h2 className="card-title text-lg">System Status</h2>
              <p className="text-sm text-base-content/60">Live system announcements</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`badge badge-sm ${isLive ? 'badge-success' : 'badge-neutral'}`}>
              {isLive ? '● LIVE' : '○ PAUSED'}
            </div>
            <button 
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() => setIsLive(!isLive)}
              title={isLive ? 'Pause live updates' : 'Resume live updates'}
            >
              {isLive ? '⏸️' : '▶️'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="card-body p-6">
        <div className={`mockup-code bg-base-300 ${maxHeight} overflow-y-auto`}>
          {showCommands && (
            <pre data-prefix="$" className="text-primary">
              <code>hivemind monitor --live --follow</code>
            </pre>
          )}
          
          {announcements.map((announcement, index) => (
            <pre 
              key={announcement.id}
              data-prefix={`[${formatTime(announcement.timestamp)}]`}
              className={getTypeColor(announcement.type)}
            >
              <code>
                <span className="mr-2">{getTypePrefix(announcement.type)}</span>
                {announcement.message}
              </code>
            </pre>
          ))}
          
          {announcements.length === 0 && (
            <pre data-prefix=">" className="text-base-content/60">
              <code>Waiting for system events...</code>
            </pre>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-4 text-xs text-base-content/60">
          <span>Last updated: {formatTime(new Date())}</span>
          <span>{announcements.length} recent events</span>
        </div>
      </div>
    </div>
  );
};

export default SystemAnnouncements;