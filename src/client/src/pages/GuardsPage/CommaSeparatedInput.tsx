import React, { useState } from 'react';
import { Badge } from '../../components/DaisyUI/Badge';
import Button from '../../components/DaisyUI/Button';
import Input from '../../components/DaisyUI/Input';

export const CommaSeparatedInput = ({
  value,
  onChange,
  disabled,
  placeholder,
  id,
  validate
}: {
  value: string[];
  onChange: (val: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  validate?: (val: string) => string | null;
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addCurrentValue();
    }
  };

  const addCurrentValue = () => {
    const trimmed = inputValue.trim().replace(/,$/, '');
    if (!trimmed) return;

    if (validate) {
      const err = validate(trimmed);
      if (err) {
        setError(err);
        return;
      }
    }

    if (!value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
    setError(null);
  };

  const removeValue = (toRemove: string) => {
    onChange(value.filter(v => v !== toRemove));
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map(val => (
          <Badge key={val} variant="primary" className="gap-1 p-3">
            {val}
            {!disabled && (
              <Button
                variant="ghost"
                size="xs"
                className="btn-circle h-4 w-4 min-h-0"
                onClick={() => removeValue(val)}
                aria-label={`Remove ${val}`}
              >
                ✕
              </Button>
            )}
          </Badge>
        ))}
      </div>
      <Input
        id={id}
        value={inputValue}
        onChange={e => {
          setInputValue(e.target.value);
          if (e.target.value.includes(',')) {
            // Trigger add if they paste or type a comma
            setTimeout(addCurrentValue, 0);
          }
        }}
        onKeyDown={handleKeyDown}
        onBlur={addCurrentValue}
        disabled={disabled}
        placeholder={placeholder || "Type and press Enter or comma..."}
        variant={error ? 'error' : undefined}
      />
      {error && <span className="label-text-alt text-error mt-1">{error}</span>}
    </div>
  );
};
