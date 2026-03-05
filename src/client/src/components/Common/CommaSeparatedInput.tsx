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

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
    setInputValue('');
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    const current = pastedText
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
        onPaste={handlePaste}
        placeholder={value.length >= maxItems ? 'Max items reached' : placeholder}
        disabled={disabled || value.length >= maxItems}
      />
      {!disabled && value.length > 0 && (
        <button
          type="button"
          onClick={handleClearAll}
          className="p-1 mx-1 rounded-full text-base-content/40 hover:text-error hover:bg-error/10 focus:outline-none transition-colors"
          title="Clear all"
          aria-label="Clear all items"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
};
