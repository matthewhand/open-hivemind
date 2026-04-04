import React from 'react';
import { BotAvatar } from './BotAvatar';
import Divider from './DaisyUI/Divider';
import Dropdown from './DaisyUI/Dropdown';
import Indicator from './DaisyUI/Indicator';
import Badge from './DaisyUI/Badge';
import { Cpu, ChevronDown, Check } from 'lucide-react';
import { LoadingSpinner } from './DaisyUI/Loading';
import type { BotData, LlmProviderOption } from '../pages/ChatPage';

interface BotListItemProps {
  bot: BotData;
  isSelected: boolean;
  onSelect: (botId: string) => void;
  llmProviders: LlmProviderOption[];
  swappingProvider: string | null;
  showProviderDropdown: string | null;
  onToggleDropdown: (isOpen: boolean, botId: string) => void;
  onSwapProvider: (botId: string, providerKey: string) => void;
}

export const BotListItem: React.FC<BotListItemProps> = ({
  bot,
  isSelected,
  onSelect,
  llmProviders,
  swappingProvider,
  showProviderDropdown,
  onToggleDropdown,
  onSwapProvider,
}) => {
  return (
    <li className="relative">
      <button
        className={`${isSelected ? 'active' : ''} flex items-center gap-3 py-3 w-full text-left`}
        onClick={() => onSelect(bot.id)}
        aria-label={`Select bot ${bot.name}`}
        aria-current={isSelected ? 'true' : undefined}
      >
        <Indicator
          item={<Badge color={bot.connected ? 'success' : undefined} className="badge-xs p-0 w-3 h-3" />}
          verticalPosition="bottom"
          horizontalPosition="end"
        >
          <BotAvatar bot={bot} />
        </Indicator>
        <div className="flex flex-col items-start min-w-0 flex-1">
          <span className="font-semibold truncate w-full text-left">{bot.name}</span>
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs opacity-50 truncate text-left capitalize">{bot.messageProvider}</span>
            <span className="text-xs opacity-30">•</span>
            {/* LLM Provider Hot Swap Dropdown */}
            <Dropdown
              className="flex-1"
              triggerClassName="btn-ghost btn-xs px-1 min-h-0 h-auto flex items-center gap-1 text-xs opacity-70 hover:opacity-100 group"
              contentClassName="shadow-lg bg-base-100 w-52 z-50 max-h-60 overflow-y-auto"
              position="right"
              size="none"
              color="none"
              hideArrow={true}
              isOpen={showProviderDropdown === bot.id}
              onToggle={(isOpen) => onToggleDropdown(isOpen, bot.id)}
              disabled={swappingProvider === bot.id}
              trigger={
                <>
                  <Cpu className="w-3 h-3" />
                  {swappingProvider === bot.id ? (
                    <LoadingSpinner size="xs" />
                  ) : (
                    <>
                      <span className="truncate max-w-[80px]" title="Click to change LLM provider">{bot.llmProvider || 'Default'}</span>
                      <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                    </>
                  )}
                </>
              }
            >
              <li className="menu-title">
                <span>Switch Provider</span>
              </li>
              <li>
                <button
                  className={`${!bot.llmProvider ? 'active' : ''} btn btn-ghost btn-sm justify-start`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwapProvider(bot.id, '');
                  }}
                >
                  <Check className={`w-4 h-4 ${!bot.llmProvider ? 'visible' : 'invisible'}`} />
                  System Default
                </button>
              </li>
              <Divider className="my-1" />
              {llmProviders.map(provider => (
                <li key={provider.key}>
                  <button
                    className={`${bot.llmProvider === provider.key ? 'active' : ''} btn btn-ghost btn-sm justify-start`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSwapProvider(bot.id, provider.key);
                    }}
                  >
                    <Check className={`w-4 h-4 ${bot.llmProvider === provider.key ? 'visible' : 'invisible'}`} />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{provider.name}</span>
                      <span className="text-xs opacity-50">{provider.provider}</span>
                    </div>
                  </button>
                </li>
              ))}
            </Dropdown>
          </div>
        </div>
      </button>
    </li>
  );
};
