import React from 'react';
import { Bot, Globe, Cpu, Settings, Pause, Play, Trash2, MoreVertical } from 'lucide-react';
import type { BotConfig } from '../../types/bot';
import Card from '../../components/DaisyUI/Card';
import Badge from '../../components/DaisyUI/Badge';
import Button from '../../components/DaisyUI/Button';
import Dropdown from '../../components/DaisyUI/Dropdown';
import { useUIStore } from '../../store/uiStore';

interface BotConfigCardProps {
  bot: BotConfig;
  isSelected?: boolean;
  onPreview?: (bot: BotConfig) => void;
  onEdit?: (bot: BotConfig) => void;
  onDelete?: (bot: BotConfig) => void;
  onToggleStatus?: (bot: BotConfig) => void;
}

const STATUS_BADGE: Record<string, 'success' | 'ghost' | 'error' | 'info' | 'neutral'> = {
  active: 'success',
  running: 'success',
  inactive: 'ghost',
  stopped: 'ghost',
  disabled: 'ghost',
  error: 'error',
  starting: 'info',
  stopping: 'ghost',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Running',
  running: 'Running',
  inactive: 'Stopped',
  stopped: 'Stopped',
  disabled: 'Disabled',
  error: 'Error',
  starting: 'Starting',
  stopping: 'Stopping',
};

const BotConfigCard: React.FC<BotConfigCardProps> = ({
  bot,
  isSelected,
  onPreview,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const showDescriptions = useUIStore((s) => s.showDescriptions);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const status = bot.status || 'inactive';
  const badgeVariant = STATUS_BADGE[status] ?? 'neutral';
  const statusLabel = STATUS_LABEL[status] ?? status;
  const isActive = status === 'active' || status === 'running';

  return (
    <Card
      className={`shadow-xl border transition-shadow duration-200 cursor-pointer
        ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-base-300 hover:shadow-2xl'}`}
      onClick={onPreview ? () => onPreview(bot) : undefined}
    >
      <Card.Body className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <div className="p-1.5 rounded bg-primary/10 shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-lg font-semibold truncate break-all min-w-0" title={bot.name}>
                {bot.name}
              </h3>
              <Badge variant={badgeVariant} size="sm" className="whitespace-nowrap shrink-0">
                {statusLabel}
              </Badge>
            </div>
            {showDescriptions && bot.description && (
              <p className="text-sm text-base-content/60 line-clamp-2">{bot.description}</p>
            )}
          </div>

          {/* Dropdown Menu */}
          <Dropdown
            trigger={<MoreVertical className="w-4 h-4" aria-hidden="true" />}
            position="bottom"
            color="ghost"
            size="sm"
            className="dropdown-end"
            triggerClassName="btn-circle"
            contentClassName="shadow-lg w-48 z-10"
            isOpen={isDropdownOpen}
            onToggle={(open) => setIsDropdownOpen(open)}
            hideArrow
            aria-label={`Options for ${bot.name}`}
          >
            <li>
              <a
                onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(false); onEdit?.(bot); }}
                className="flex items-center gap-2"
                role="menuitem"
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
                Configure
              </a>
            </li>
            <li>
              <a
                onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(false); onDelete?.(bot); }}
                className="flex items-center gap-2 text-error"
                role="menuitem"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                Delete
              </a>
            </li>
          </Dropdown>
        </div>

        {/* Provider Info */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-base-200/50 p-2 rounded-lg">
            <label className="text-xs font-bold uppercase opacity-50 block mb-1">Message</label>
            <div className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-primary shrink-0" />
              <span className="text-xs font-medium uppercase truncate">
                {bot.messageProvider || 'None'}
              </span>
            </div>
          </div>
          <div className="bg-base-200/50 p-2 rounded-lg">
            <label className="text-xs font-bold uppercase opacity-50 block mb-1">LLM</label>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-secondary shrink-0" />
              <span className="text-xs font-medium truncate">
                {bot.llmProvider || 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        {(bot.messageCount !== undefined || bot.errorCount !== undefined) && (
          <div className="grid grid-cols-2 gap-2 mb-4 text-center">
            <div className="bg-base-200/50 p-2 rounded-lg">
              <div className="text-lg font-bold text-primary">{bot.messageCount ?? 0}</div>
              <div className="text-xs uppercase font-bold opacity-50">Messages</div>
            </div>
            <div className="bg-base-200/50 p-2 rounded-lg">
              <div className={`text-lg font-bold ${(bot.errorCount ?? 0) > 0 ? 'text-error' : ''}`}>
                {bot.errorCount ?? 0}
              </div>
              <div className="text-xs uppercase font-bold opacity-50">Errors</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-base-200">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={(e) => { e.stopPropagation(); onEdit?.(bot); }}
          >
            <Settings className="w-3 h-3 mr-1" />
            Configure
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`btn-square ${isActive ? 'text-error border-error' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleStatus?.(bot); }}
            aria-label={isActive ? 'Deactivate' : 'Activate'}
          >
            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default BotConfigCard;
