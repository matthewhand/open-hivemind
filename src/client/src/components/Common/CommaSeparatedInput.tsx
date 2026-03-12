import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface CommaSeparatedInputProps {
  value: string[];
  onChange: (v: string[]) => void;
  maxItems?: number;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  suggestions?: string[];
  tagColor?: (tag: string) => string;
  error?: string;
  validate?: (item: string) => string | null;
  /** Additional delimiter characters besides comma. E.g. [';'] to also split on semicolons. */
  extraDelimiters?: string[];
}

export const CommaSeparatedInput: React.FC<CommaSeparatedInputProps> = ({
  value,
  onChange,
  maxItems = 20,
  placeholder = 'Type and press Enter, Tab, or comma',
  disabled = false,
  id,
  className = '',
  suggestions = [],
  tagColor,
  error,
  validate,
  extraDelimiters = [],
}) => {
  const delimiterRegex = React.useMemo(() => {
    const escaped = [',', ...extraDelimiters].map(d => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`[${escaped.join('')}]`);
  }, [extraDelimiters]);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Blur state for validation
  const [isTouched, setIsTouched] = useState(false);

  // Ref for history stack to not cause unnecessary re-renders
  const historyRef = useRef<string[][]>([]);
  // Keep track of active index if we want redo, but we'll just implement simple undo
  const [canUndo, setCanUndo] = useState(false);

  // We need to keep a ref of current value to push to history
  const currentValueRef = useRef(value);

  useEffect(() => {
    // Only update if it actually changed to avoid infinite loops,
    // though the parent might give us the same array ref if we're lucky.
    if (JSON.stringify(currentValueRef.current) !== JSON.stringify(value)) {
      currentValueRef.current = value;
    }
  }, [value]);

  const pushToHistory = useCallback((newValue: string[]) => {
    const last = historyRef.current[historyRef.current.length - 1];
    if (!last || JSON.stringify(last) !== JSON.stringify(currentValueRef.current)) {
      historyRef.current.push([...currentValueRef.current]);
      setCanUndo(true);
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (!canUndo || disabled) return;
    const previous = historyRef.current.pop();
    if (previous) {
      onChange(previous);
      setCanUndo(historyRef.current.length > 0);
    }
  }, [canUndo, disabled, onChange]);

  const commitInput = (forceValue?: string) => {
    const textToCommit = forceValue !== undefined ? forceValue : inputValue;
    if (!textToCommit.trim()) {
      setIsTouched(true);
      return;
    }

    const current = textToCommit
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const next = [...value];
    let changed = false;
    let localError: string | null = null;

    for (const item of current) {
      if (validate) {
        const validationError = validate(item);
        if (validationError) {
          localError = validationError;
          break; // Stop parsing if there's an invalid item
        }
      }

      if (!next.includes(item) && next.length < maxItems) {
        next.push(item);
        changed = true;
      }
    }

    setInternalError(localError);
    setIsTouched(true);

    if (!localError) {
      if (changed) {
        pushToHistory(next);
        onChange(next);
      }
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      commitInput();
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      const next = value.slice(0, -1);
      pushToHistory(next);
      onChange(next);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      handleUndo();
    }
  };

  const handleRemove = (itemToRemove: string) => {
    if (disabled) return;
    const next = value.filter(item => item !== itemToRemove);
    pushToHistory(next);
    onChange(next);
  };

  const handleClearAll = () => {
    if (disabled) return;
    pushToHistory([]);
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
    if (changed) {
      pushToHistory(next);
      onChange(next);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    if (delimiterRegex.test(val)) {
      // Split the current value into potential items
      const parts = val.split(delimiterRegex);
      const lastPart = parts.pop() || ''; // The remainder after the last comma

      const validParts = parts.map(p => p.trim()).filter(Boolean);

      if (validParts.length > 0) {
        const next = [...value];
        let changed = false;
        let localError: string | null = null;
        const uncommittedParts: string[] = [];

        for (const item of validParts) {
          // If we've hit max items, keep the rest in the input
          if (next.length >= maxItems) {
            uncommittedParts.push(item);
            continue;
          }

          if (validate) {
            const validationError = validate(item);
            if (validationError) {
              localError = validationError;
              uncommittedParts.push(item);
              // Stop processing if one fails validation, keep the rest uncommitted
              continue;
            }
          }

          if (!next.includes(item)) {
            next.push(item);
            changed = true;
          }
        }

        setInternalError(localError);
        setIsTouched(true);

        if (changed) {
          pushToHistory(next);
          onChange(next);
        }

        // Reconstruct the input value using any uncommitted parts plus the remainder
        let nextInputValue = uncommittedParts.join(', ');
        if (uncommittedParts.length > 0 && lastPart) {
           nextInputValue += ', ' + lastPart.trimStart();
        } else if (lastPart) {
           nextInputValue = lastPart.trimStart();
        }

        setInputValue(nextInputValue);
        setShowSuggestions(false);
      } else {
        // Delimiters were typed but no valid text existed before them
        setInputValue(lastPart.trimStart());
      }
    } else {
      setInputValue(val);
      setShowSuggestions(true);
      if (internalError) {
        setInternalError(null);
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (disabled) return;
    commitInput(suggestion);
  };

  const filteredSuggestions = suggestions.filter(s =>
    !value.includes(s) &&
    s.toLowerCase().includes(inputValue.toLowerCase())
  );

  const displayError = (isTouched && internalError) || error;
  const errorId = id ? `${id}-error` : 'csi-error';

  return (
    <div className={`relative flex flex-col w-full ${className}`}>
      <div
        className={`flex flex-wrap items-center gap-2 p-1 bg-base-100 border rounded-lg focus-within:ring-2 ${
          displayError ? 'border-error focus-within:ring-error' : 'focus-within:ring-primary'
        }`}
      >
        {value.map(v => {
        const customColorClass = tagColor ? tagColor(v) : 'bg-base-200 text-base-content';
        return (
        <span
          key={v}
          data-testid="chip"
          className={`flex items-center gap-1 px-2 py-1 text-sm rounded-md ${customColorClass}`}
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
          );
        })}
        <input
          id={id}
          data-testid="csi-input"
          className="flex-1 bg-transparent outline-none min-w-[120px] px-1"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Add a small delay so suggestion clicks can fire before blur
            setTimeout(() => commitInput(), 150);
          }}
          onPaste={handlePaste}
          placeholder={value.length >= maxItems ? 'Max items reached' : placeholder}
          disabled={disabled || value.length >= maxItems}
          aria-invalid={!!displayError}
          aria-describedby={displayError ? errorId : undefined}
        />
      <div className="flex items-center gap-1">
        {!disabled && canUndo && (
          <button
            type="button"
            onClick={handleUndo}
            className="p-1 mx-1 rounded-full text-base-content/40 hover:text-primary hover:bg-primary/10 focus:outline-none transition-colors"
            title="Undo last change (Ctrl+Z)"
            aria-label="Undo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>
        )}
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
      </div>

      {displayError && (
        <label className="label" id={errorId}>
          <span className="label-text-alt text-error">{displayError}</span>
        </label>
      )}

      {/* Autocomplete Dropdown */}
      {!disabled && showSuggestions && filteredSuggestions.length > 0 && inputValue.trim().length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-auto rounded-md bg-base-100 shadow-lg ring-1 ring-base-content/5 z-50">
          {filteredSuggestions.map(s => (
            <li
              key={s}
              onMouseDown={(e) => {
                // Prevent input blur before click fires
                e.preventDefault();
                handleSuggestionClick(s);
              }}
              className="cursor-pointer select-none px-4 py-2 hover:bg-base-200 text-sm text-base-content"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
