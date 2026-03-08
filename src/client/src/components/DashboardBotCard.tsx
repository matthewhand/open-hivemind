import React, { memo } from 'react';
import { Badge, Card, Rating, Button } from './DaisyUI';
import type { Bot, StatusResponse } from '../services/api';

interface DashboardBotCardProps {
  bot: Bot;
  botStatusData: StatusResponse['bots'][0] | undefined;
  rating: number;
  onRatingChange: (botName: string, rating: number) => void;
  getProviderIcon: (provider: string) => string;
  getStatusColor: (status: string) => string;
}

const DashboardBotCard: React.FC<DashboardBotCardProps> = memo(({
  bot,
  botStatusData,
  rating,
  onRatingChange,
  getProviderIcon,
  getStatusColor,
}) => {
  const botStatus = botStatusData?.status || 'unknown';
  const connected = botStatusData?.connected ?? false;
  const messageCount = botStatusData?.messageCount ?? 0;
  const errorCount = botStatusData?.errorCount ?? 0;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
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
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-sm">
              ⚙️
            </label>
            <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
              <li><a>🔧 Configure</a></li>
              <li><a>📊 View Logs</a></li>
              <li><a>🔄 Restart</a></li>
              <li><a>🔍 Debug</a></li>
            </ul>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge
            variant={getStatusColor(botStatus) as 'success' | 'warning' | 'error' | 'info'}
            className="text-xs font-semibold"
          >
            {botStatus.toUpperCase()}
          </Badge>
          {bot.llmProvider && (
            <Badge variant="secondary" className="text-xs">
              🧠 {bot.llmProvider.toUpperCase()}
            </Badge>
          )}
          <Badge variant="neutral" className="badge-outline text-xs">
            📱 {bot.messageProvider.toUpperCase()}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="stat bg-base-200 rounded-lg p-3">
            <div className="stat-title text-xs">Messages</div>
            <div className="stat-value text-lg">{messageCount.toLocaleString()}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-3">
            <div className="stat-title text-xs">Status</div>
            <div className={`stat-value text-lg ${connected ? 'text-success' : 'text-error'}`}>
              {connected ? '🟢' : '🔴'}
            </div>
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
            value={rating}
            onChange={(newRating) => onRatingChange(bot.name, newRating)}
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
});

DashboardBotCard.displayName = 'DashboardBotCard';

export default DashboardBotCard;
