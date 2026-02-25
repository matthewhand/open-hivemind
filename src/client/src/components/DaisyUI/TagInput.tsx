import React, { useState, KeyboardEvent, useEffect } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onBlur?: () => void;
}

const TagInput: React.FC<TagInputProps> = ({
  value = [],
  onChange,
  placeholder = 'Add tag...',
  disabled = false,
  className = '',
  onBlur,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  const addTag = () => {
    const trimmedInput = inputValue.trim();
    if (trimmedInput && !value.includes(trimmedInput)) {
      onChange([...value, trimmedInput]);
      setInputValue('');
    }
  };

  const removeTag = (index: number) => {
    if (disabled) return;
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className={`input input-bordered flex flex-wrap items-center gap-2 h-auto py-2 ${className} ${disabled ? 'bg-base-200 opacity-50 cursor-not-allowed' : ''}`}>
      {value.map((tag, index) => (
        <span key={index} className="badge badge-primary gap-1 py-3">
          {tag}
          {!disabled && (
            <button
              onClick={(e) => { e.preventDefault(); removeTag(index); }}
              className="hover:text-primary-content/70 transition-colors"
              type="button"
            >
              <X size={14} />
            </button>
          )}
        </span>
      ))}
      <input
        type="text"
        className="flex-1 bg-transparent border-none outline-none min-w-[120px] text-sm"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          addTag();
          if (onBlur) onBlur();
        }}
        disabled={disabled}
      />
    </div>
  );
};

export default TagInput;
