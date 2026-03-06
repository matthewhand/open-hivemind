/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from 'react';
import { Tooltip } from '../DaisyUI';
import { Plus as PlusIcon } from 'lucide-react';

interface QuickAddButtonProps {
  type: 'message' | 'llm';
  onClick: () => void;
  disabled?: false;
}

const QuickAddButton: React.FC<QuickAddButtonProps> = ({
  type,
  onClick,
  disabled = false,
}) => {
  const getTitle = () => {
    return type === 'message'
      ? 'Add Message Provider'
      : 'Add LLM Provider';
  };

  const getTooltip = () => {
    if (disabled) {
      return 'Cannot add providers while bot is running';
    }
    return type === 'message'
      ? 'Add Discord, Mattermost, Slack, or Webhook provider'
      : 'Add OpenAI, Flowise, OpenWebUI, or other LLM provider';
  };

  return (
    <Tooltip content={getTooltip()} position="right">
      <button
        className={`
          btn btn-circle btn-sm btn-primary
          ${disabled ? 'btn-disabled' : 'hover:scale-110'}
          transition-transform duration-200
        `}
        onClick={onClick}
        disabled={disabled}
        title={getTitle()}
        aria-label={getTitle()}
      >
        <PlusIcon className="w-4 h-4" />
      </button>
    </Tooltip>
  );
};

export default QuickAddButton;