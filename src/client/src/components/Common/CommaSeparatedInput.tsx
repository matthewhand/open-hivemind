import React, { useState } from 'react';

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
  maxItems?: number;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const CommaSeparatedInput: React.FC<Props> = ({
  value,
  onChange,
  maxItems = 20,
  placeholder = 'Type and press Enter or comma',
  disabled = false,
  id,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('');

  const commitInput = () => {
    if (!inputValue.trim()) return;
    const current = inputValue
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const next = [...value];
    let changed = false;
    for (const item of current) {
      if (!next.includes(item) && next.length < maxItems) {
        next.push(item);
        changed = true;
      }
    }
    if (changed) onChange(next);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitInput();
    }
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handleRemove = (itemToRemove: string) => {
    if (disabled) return;
    onChange(value.filter(item => item !== itemToRemove));
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 p-1 bg-base-100 border rounded-lg focus-within:ring-2 focus-within:ring-primary ${className}`}>
      {value.map(v => (
        <span
          key={v}
          data-testid="chip"
          className="flex items-center gap-1 px-2 py-1 text-sm bg-base-200 text-base-content rounded-md"
        >
          {v}
          {!disabled && (
            <button
              type="button"
              className="text-base-content/50 hover:text-base-content"
              onClick={() => handleRemove(v)}
              aria-label={`Remove ${v}`}
            >
              &times;
            </button>
          )}
        </span>
      ))}
      <input
        id={id}
        data-testid="csi-input"
        className="flex-1 bg-transparent outline-none min-w-[120px] px-1"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitInput}
        placeholder={value.length >= maxItems ? 'Max items reached' : placeholder}
        disabled={disabled || value.length >= maxItems}
      />
    </div>
  );
};
