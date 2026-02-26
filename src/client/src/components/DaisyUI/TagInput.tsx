import React, { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const TagInput: React.FC<TagInputProps> = ({
  value = [],
  onChange,
  placeholder = 'Type and press Enter...',
  disabled = false,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed]);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (disabled) return;
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 p-2 border rounded-lg bg-base-100 border-base-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${className}`}>
      {value.map((tag, index) => (
        <div key={`${tag}-${index}`} className="badge badge-primary gap-1 pr-1">
          {tag}
          {!disabled && (
            <button
              onClick={() => removeTag(tag)}
              className="btn btn-ghost btn-xs btn-circle h-4 w-4 min-h-0 hover:bg-primary-focus text-primary-content"
              type="button"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
      <input
        type="text"
        className="flex-grow bg-transparent outline-none min-w-[120px] text-sm py-1"
        placeholder={value.length === 0 ? placeholder : ''}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
    </div>
  );
};

export default TagInput;
