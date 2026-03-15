import React, { useState, useEffect } from 'react';

interface Props {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const CommaSeparatedInput: React.FC<Props> = ({ id, value, onChange, disabled, placeholder, className }) => {
  const [inputValue, setInputValue] = useState('');

  // Buffer value prop initially, but use deep comparison or a custom approach
  // to avoid resetting state due to inline [] passed from parent
  const valueString = value.join(',');
  useEffect(() => {
    setInputValue(valueString);
  }, [valueString]);

  const handleBlur = () => {
    if (inputValue.trim() === '') {
      onChange([]);
    } else {
      // Split by comma, trim, filter out empty strings, and remove duplicates
      const tokens = Array.from(new Set(
        inputValue.split(',')
          .map(s => s.trim())
          .filter(Boolean)
      ));
      onChange(tokens);
      setInputValue(tokens.join(', ')); // Add a space for better readability
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    }
  };

  return (
    <input
      id={id}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
    />
  );
};
