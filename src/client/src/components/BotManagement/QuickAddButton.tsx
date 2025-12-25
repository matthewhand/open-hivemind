import React from 'react';
import { Button } from '../DaisyUI';
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
      ? 'Add Discord, Telegram, Slack, or Webhook provider'
      : 'Add OpenAI, Anthropic, Ollama, or Custom LLM provider';
  };

  return (
    <button
      className={`
        btn btn-circle btn-sm btn-primary
        ${disabled ? 'btn-disabled' : 'hover:scale-110'}
        transition-transform duration-200
        tooltip tooltip-right
      `}
      onClick={onClick}
      disabled={disabled}
      data-tip={getTooltip()}
      title={getTitle()}
    >
      <PlusIcon className="w-4 h-4" />
    </button>
  );
};

export default QuickAddButton;