import React from 'react';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import BotCard from '../../components/BotManagement/BotCard';
import type { BotConfig } from '../../types/bot';
import Checkbox from '../../components/DaisyUI/Checkbox';

interface BotListGridProps {
  filteredBots: BotConfig[];
  previewBot: BotConfig | null;
  handlePreviewBot: (bot: BotConfig) => void;
  setEditingBot: (bot: BotConfig | null) => void;
  setDeletingBot: (bot: BotConfig | null) => void;
  handleToggleBotStatus: (bot: BotConfig) => void;
  bulk: any;
  isMobile: boolean;
  onBotDragStart: (index: number) => (e: React.DragEvent) => void;
  onBotDragOver: (index: number) => (e: React.DragEvent) => void;
  onBotDragEnd: () => void;
  onBotDrop: (index: number) => (e: React.DragEvent) => void;
  getBotItemStyle: (index: number) => React.CSSProperties;
  onBotMoveUp: (index: number) => void;
  onBotMoveDown: (index: number) => void;
}

export const BotListGrid: React.FC<BotListGridProps> = ({
  filteredBots,
  previewBot,
  handlePreviewBot,
  setEditingBot,
  setDeletingBot,
  handleToggleBotStatus,
  bulk,
  isMobile,
  onBotDragStart,
  onBotDragOver,
  onBotDragEnd,
  onBotDrop,
  getBotItemStyle,
  onBotMoveUp,
  onBotMoveDown,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {filteredBots.map((bot, index) => (
        <div
          key={bot.id}
          className="relative"
          draggable={!isMobile}
          onDragStart={onBotDragStart(index)}
          onDragOver={onBotDragOver(index)}
          onDragEnd={onBotDragEnd}
          onDrop={onBotDrop(index)}
          style={getBotItemStyle(index)}
        >
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
            <Checkbox
              variant="primary"
              size="sm"
              checked={bulk.isSelected(bot.id)}
              onChange={(e) => bulk.toggleItem(bot.id, e as any)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${bot.name}`}
            />
            {isMobile ? (
              <span className="flex flex-col">
                <button
                  className="btn btn-ghost btn-xs btn-square p-0"
                  onClick={() => onBotMoveUp(index)}
                  disabled={index === 0}
                  aria-label="Move up"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  className="btn btn-ghost btn-xs btn-square p-0"
                  onClick={() => onBotMoveDown(index)}
                  disabled={index === filteredBots.length - 1}
                  aria-label="Move down"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </span>
            ) : (
              <span
                className="cursor-grab active:cursor-grabbing text-base-content/40 hover:text-base-content/70"
                title="Drag to reorder"
              >
                <GripVertical className="w-4 h-4" />
              </span>
            )}
          </div>
          <BotCard
            bot={bot}
            isSelected={previewBot?.id === bot.id}
            onPreview={() => handlePreviewBot(bot)}
            onEdit={() => setEditingBot(bot)}
            onDelete={() => setDeletingBot(bot)}
            onToggleStatus={() => handleToggleBotStatus(bot)}
          />
        </div>
      ))}
    </div>
  );
};
