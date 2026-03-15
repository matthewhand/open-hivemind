import React, { useState, useEffect, KeyboardEvent, FocusEvent, useRef } from 'react';

export interface CommaSeparatedInputProps {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  maxItems?: number;
}

export const CommaSeparatedInput: React.FC<CommaSeparatedInputProps> = ({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = '',
  className = 'input input-bordered',
  maxItems = 100,
}) => {
  const [inputValue, setInputValue] = useState<string>(value.join(','));
  const isTyping = useRef(false);

  useEffect(() => {
    if (!isTyping.current) {
        setInputValue(value.join(','));
    }
  }, [value]);

  const commitInput = () => {
    isTyping.current = false;
    if (!inputValue.trim()) {
       onChange([]);
       setInputValue('');
       return;
    }
    const current = inputValue.split(',').map(s => s.trim()).filter(Boolean);
    const next: string[] = [];

    for (const item of current) {
      if (!next.includes(item) && next.length < maxItems) {
        next.push(item);
      }
    }

    onChange(next);
    setInputValue(next.join(','));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitInput();
    }
  };

  return (
    <input
      id={id}
      type="text"
      className={className}
      value={inputValue}
      onChange={e => {
        isTyping.current = true;
        const val = e.target.value;
        if (val.includes(',')) {
          // Tokenize immediately on comma
          const parts = val.split(',');
          const trailingText = parts.length > 1 ? parts.pop() || '' : '';
          const itemsToCommit = parts.map(s => s.trim()).filter(Boolean);

          if (itemsToCommit.length > 0) {
            const next = [...value];
            for (const item of itemsToCommit) {
              if (!next.includes(item) && next.length < maxItems) {
                next.push(item);
              }
            }
            onChange(next);
          }
          setInputValue(trailingText);
        } else {
          setInputValue(val);
        }
      }}
      onKeyDown={handleKeyDown}
      onBlur={commitInput}
      disabled={disabled}
      placeholder={placeholder}
    />
  );
};

export default CommaSeparatedInput;
