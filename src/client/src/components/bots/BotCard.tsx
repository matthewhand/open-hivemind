import React from 'react';
import { ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import type { BotConfig } from '../../types/bot';
import OriginalBotCard from '../BotManagement/BotCard';

interface BotCardProps {
  bot: BotConfig;
  index: number;
  isSelected: boolean;
  isMobile: boolean;
  bulk: any; // bulk selection hook return
  filteredBotsLength: number;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onDragStart: (index: number) => (e: React.DragEvent) => void;
  onDragOver: (index: number) => (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrop: (index: number) => (e: React.DragEvent) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  itemStyle?: React.CSSProperties;
}

export const BotCard: React.FC<BotCardProps> = ({
  bot,
  index,
  isSelected,
  isMobile,
  bulk,
  filteredBotsLength,
  onPreview,
  onEdit,
  onDelete,
  onToggleStatus,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onMoveUp,
  onMoveDown,
  itemStyle,
}) => {
  return (
    <div
      className="relative"
      draggable={!isMobile}
      onDragStart={onDragStart(index)}
      onDragOver={onDragOver(index)}
      onDragEnd={onDragEnd}
      onDrop={onDrop(index)}
      style={itemStyle}
    >
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
        <input
          type="checkbox"
          className="checkbox checkbox-sm checkbox-primary"
          checked={bulk.isSelected(bot.id)}
          onChange={(e) => bulk.toggleItem(bot.id, e as any)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${bot.name}`}
        />
        {isMobile ? (
          <span className="flex flex-col">
            <button
              className="btn btn-ghost btn-xs btn-square p-0"
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              aria-label="Move up"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              className="btn btn-ghost btn-xs btn-square p-0"
              onClick={() => onMoveDown(index)}
              disabled={index === filteredBotsLength - 1}
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
      <div onClick={onPreview} className={`cursor-pointer ${isSelected ? 'ring-2 ring-primary rounded-2xl' : ''}`}>
        <OriginalBotCard
          bot={bot as any}
          personas={[]} // We rely on OriginalBotCard to handle defaults
          onConfigureBot={(id: string) => onEdit()}
          onDeleteBot={(id: string) => onDelete()}
          onStartBot={(id: string) => onToggleStatus()}
          onStopBot={(id: string) => onToggleStatus()}
        />
      </div>
    </div>
  );
};
