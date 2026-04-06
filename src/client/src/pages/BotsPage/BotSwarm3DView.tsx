import React from 'react';
import { Bot, Globe, Cpu, MessageSquare, AlertTriangle, Play, Pause } from 'lucide-react';
import type { BotConfig } from '../../types/bot';
import Card from '../../components/DaisyUI/Card';
import Badge from '../../components/DaisyUI/Badge';

interface BotSwarm3DViewProps {
  bots: BotConfig[];
  onPreviewBot: (bot: BotConfig) => void;
  onToggleStatus: (bot: BotConfig) => void;
}

const MESSAGE_ICONS: Record<string, React.ReactNode> = {
  discord: '🎮',
  slack: '💬',
  mattermost: '💻',
  webhook: '🔗',
};

const AVATAR_COLORS = [
  'from-primary to-primary-focus',
  'from-secondary to-secondary-focus',
  'from-accent to-accent-focus',
  'from-info to-info-focus',
  'from-success to-success-focus',
  'from-warning to-warning-focus',
  'from-error to-error-focus',
  'from-neutral to-neutral-focus',
];

export const BotSwarm3DView: React.FC<BotSwarm3DViewProps> = ({
  bots,
  onPreviewBot,
  onToggleStatus,
}) => {
  return (
    <div className="flex flex-wrap justify-center gap-8 py-8 perspective-[1200px]">
      {bots.map((bot, index) => {
        const isActive = bot.isActive !== false;
        const gradientClass = AVATAR_COLORS[index % AVATAR_COLORS.length];
        const messageIcon = MESSAGE_ICONS[bot.messageProvider] || '📡';

        return (
          <Card
            key={bot.id}
            hover3d
            className="w-64 border border-base-300 cursor-pointer group"
            onClick={() => onPreviewBot(bot)}
          >
            <div className="card-body items-center text-center p-6 gap-4">
              {/* Avatar */}
              <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <Bot className="w-10 h-10 text-white" />
                {/* Status dot */}
                <span
                  className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-base-100 ${
                    isActive ? 'bg-success animate-pulse' : 'bg-base-content/30'
                  }`}
                />
              </div>

              {/* Name & status */}
              <div className="w-full">
                <h3 className="font-bold text-base truncate">{bot.name}</h3>
                <p className="text-xs text-base-content/60 line-clamp-2 mt-1 min-h-[2rem]">
                  {bot.description || 'No description'}
                </p>
              </div>

              {/* Provider badges */}
              <div className="flex flex-wrap justify-center gap-1">
                <Badge variant="ghost" size="sm" className="text-xs">
                  <span className="mr-1">{messageIcon}</span>
                  {bot.messageProvider}
                </Badge>
                {bot.llmProvider && (
                  <Badge variant="outline" size="sm" className="text-xs">
                    <Globe className="w-3 h-3 mr-1" />
                    {bot.llmProvider}
                  </Badge>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="bg-base-200/50 rounded-lg p-2 flex flex-col items-center">
                  <MessageSquare className="w-3 h-3 text-primary mb-1" />
                  <span className="text-xs font-bold">{bot.messageCount ?? 0}</span>
                  <span className="text-[10px] text-base-content/50 uppercase">msgs</span>
                </div>
                <div className="bg-base-200/50 rounded-lg p-2 flex flex-col items-center">
                  <AlertTriangle className={`w-3 h-3 mb-1 ${(bot.errorCount ?? 0) > 0 ? 'text-error' : 'text-base-content/30'}`} />
                  <span className="text-xs font-bold">{bot.errorCount ?? 0}</span>
                  <span className="text-[10px] text-base-content/50 uppercase">errs</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 w-full">
                <button
                  className={`btn btn-xs flex-1 gap-1 ${isActive ? 'btn-error btn-ghost' : 'btn-success btn-ghost'}`}
                  onClick={(e) => { e.stopPropagation(); onToggleStatus(bot); }}
                  aria-label={isActive ? 'Deactivate' : 'Activate'}
                >
                  {isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {isActive ? 'Stop' : 'Start'}
                </button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
