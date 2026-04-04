import React, { memo } from 'react';
import Badge from './DaisyUI/Badge';
import Card from './DaisyUI/Card';
import Rating from './DaisyUI/Rating';
import Button from './DaisyUI/Button';
import { Alert } from './DaisyUI/Alert';
import Dropdown from './DaisyUI/Dropdown';
import { Stat } from './DaisyUI/Stat';
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
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">
              {getProviderIcon(bot.messageProvider)}
            </div>
            <div>
              <Card.Title className="text-lg font-bold">
                {bot.name}
              </Card.Title>
              <p className="text-sm opacity-70">{bot.messageProvider}</p>
            </div>
          </div>
          <Dropdown
            trigger="⚙️"
            position="bottom"
            className="dropdown-end"
            size="sm"
            color="ghost"
            hideArrow={true}
          >
            <li><a>🔧 Configure</a></li>
            <li><a>📊 View Logs</a></li>
            <li><a>🔄 Restart</a></li>
            <li><a>🔍 Debug</a></li>
          </Dropdown>
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
          <Stat className="bg-base-200 rounded-lg p-3">
            <div className="stat-title text-xs">Messages</div>
            <div className="stat-value text-lg">{messageCount.toLocaleString()}</div>
          </Stat>
          <Stat className="bg-base-200 rounded-lg p-3">
            <div className="stat-title text-xs">Status</div>
            <div className={`stat-value text-lg ${connected ? 'text-success' : 'text-error'}`}>
              {connected ? '🟢' : '🔴'}
            </div>
          </Stat>
        </div>

        {errorCount > 0 && (
          <Alert status="error" className="mb-4" message={`${errorCount} errors detected`} />
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
        <Card.Actions className="justify-between">
          <Button variant="ghost" size="sm">
            📊 Analytics
          </Button>
          <Button variant="primary" size="sm">
            💬 Interact
          </Button>
        </Card.Actions>
    </Card>
  );
});

DashboardBotCard.displayName = 'DashboardBotCard';

export default DashboardBotCard;
