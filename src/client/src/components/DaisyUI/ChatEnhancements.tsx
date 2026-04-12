/**
 * Chat Enhancements
 * Quick action buttons and stats display for ChatInterface
 */

import React from 'react';
import Button from './Button';

interface QuickAction {
  id: string;
  label: string;
  command: string;
  icon?: React.ReactNode;
  description?: string;
}

const defaultQuickActions: QuickAction[] = [
  { id: 'status', label: 'Status', command: '/status', icon: '📊', description: 'Check bot status' },
  { id: 'help', label: 'Help', command: '/help', icon: '❓', description: 'Show help menu' },
  { id: 'restart', label: 'Restart', command: '/restart', icon: '🔄', description: 'Restart the bot' },
  { id: 'settings', label: 'Settings', command: '/settings', icon: '⚙️', description: 'Open settings' },
];

interface ChatQuickActionsProps {
  onCommand?: (command: string) => void;
  actions?: QuickAction[];
  className?: string;
  disabled?: boolean;
}

/**
 * Quick action buttons for common bot commands
 */
export function ChatQuickActions({
  onCommand,
  actions = defaultQuickActions,
  className = '',
  disabled = false,
}: ChatQuickActionsProps) {
  const handleClick = (action: QuickAction) => {
    onCommand?.(action.command);
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {actions.map((action) => (
        <Button
          key={action.id}
          size="sm"
          variant="ghost"
          onClick={() => handleClick(action)}
          disabled={disabled}
          title={action.description}
          className="gap-1"
        >
          {action.icon && <span>{action.icon}</span>}
          <span>{action.label}</span>
        </Button>
      ))}
    </div>
  );
}

interface ChatStatsProps {
  messages: number;
  activeUsers?: number;
  uptime?: string;
  responseTime?: number; // in milliseconds
  className?: string;
}

/**
 * Display chat statistics
 */
export function ChatStats({
  messages,
  activeUsers,
  uptime,
  responseTime,
  className = '',
}: ChatStatsProps) {
  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className={`flex flex-wrap items-center gap-4 text-sm text-base-content/70 ${className}`}>
      <div className="flex items-center gap-1">
        <span className="text-lg">💬</span>
        <span>{messages.toLocaleString()} messages</span>
      </div>

      {activeUsers !== undefined && (
        <div className="flex items-center gap-1">
          <span className="text-lg">👥</span>
          <span>{activeUsers.toLocaleString()} users</span>
        </div>
      )}

      {uptime && (
        <div className="flex items-center gap-1">
          <span className="text-lg">⏱️</span>
          <span>Up {uptime}</span>
        </div>
      )}

      {responseTime !== undefined && (
        <div className="flex items-center gap-1">
          <span className={`text-lg ${responseTime > 2000 ? 'text-warning' : responseTime > 1000 ? 'text-info' : 'text-success'}`}>
            ⚡
          </span>
          <span>{formatResponseTime(responseTime)}</span>
        </div>
      )}
    </div>
  );
}

export { defaultQuickActions };
export type { QuickAction, ChatQuickActionsProps, ChatStatsProps };
