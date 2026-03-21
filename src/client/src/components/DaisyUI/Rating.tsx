/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';

export interface RatingProps {
  /** Current rating value (0-max, can be decimal for half-stars) */
  value?: number;
  /** Maximum number of rating items */
  max?: number;
  /** Size of the rating component */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Shape of the rating items */
  shape?: 'star' | 'heart';
  /** Whether the rating is read-only */
  readOnly?: boolean;
  /** Whether to show half-star ratings */
  half?: boolean;
  /** Callback when rating changes */
  onChange?: (value: number) => void;
  /** Additional CSS classes */
  className?: string;
  /** ARIA label for accessibility */
  'aria-label'?: string;
  /** ARIA labelledby for accessibility */
  'aria-labelledby'?: string;
  /** Name for the radio group */
  name?: string;
}

export const Rating: React.FC<RatingProps> = ({
  value = 0,
  max = 5,
  size = 'md',
  shape = 'star',
  readOnly = false,
  half = true,
  onChange,
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  name,
  ...props
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const groupName = name || `rating-${Math.random().toString(36).substr(2, 9)}`;

  const getSizeClass = () => {
    switch (size) {
    case 'xs': return 'rating-xs';
    case 'sm': return 'rating-sm';
    case 'lg': return 'rating-lg';
    default: return '';
    }
  };

  const getHalfClass = () => {
    return half ? 'rating-half' : '';
  };

  const getMaskClass = () => {
    switch (shape) {
    case 'heart': return 'mask-heart';
    default: return 'mask-star-2';
    }
  };

  const handleInputChange = (newValue: number) => {
    if (readOnly) {return;}
    onChange?.(newValue);
  };

  const handleMouseEnter = (index: number) => {
    if (readOnly) {return;}
    setHoverValue(index);
  };

  const handleMouseLeave = () => {
    if (readOnly) {return;}
    setHoverValue(null);
  };

  const getDisplayValue = () => {
    return hoverValue !== null ? hoverValue : value;
  };

  const baseClasses = 'rating';
  const sizeClass = getSizeClass();
  const halfClass = getHalfClass();
  const maskClass = getMaskClass();

  const containerProps = {
    className: `${baseClasses} ${sizeClass} ${halfClass} ${className}`.trim(),
    'aria-label': ariaLabel || `Rating out of ${max}`,
    'aria-labelledby': ariaLabelledBy,
    role: 'radiogroup',
    onMouseLeave: handleMouseLeave,
  };

  const renderRatingItems = () => {
    const items = [];
    const displayValue = getDisplayValue();

    // Add hidden input for 0 rating
    items.push(
      <input
        key="rating-0"
        type="radio"
        name={groupName}
        className="rating-hidden"
        checked={displayValue === 0}
        onChange={() => handleInputChange(0)}
        disabled={readOnly}
        aria-label="No rating"
      />,
    );

    for (let i = 1; i <= max; i++) {
      if (half) {
        // Half rating
        items.push(
          <input
            key={`rating-${i}-half`}
            type="radio"
            name={groupName}
            className={`mask ${maskClass} bg-orange-400`}
            style={{ maskPosition: 'left' }}
            checked={displayValue === i - 0.5}
            onChange={() => handleInputChange(i - 0.5)}
            onMouseEnter={() => handleMouseEnter(i - 0.5)}
            disabled={readOnly}
            aria-label={`Rate ${i - 0.5} out of ${max}`}
          />,
        );
      }

      // Full rating
      items.push(
        <input
          key={`rating-${i}`}
          type="radio"
          name={groupName}
          className={`mask ${maskClass} bg-orange-400`}
          checked={displayValue === i}
          onChange={() => handleInputChange(i)}
          onMouseEnter={() => handleMouseEnter(i)}
          disabled={readOnly}
          aria-label={`Rate ${i} out of ${max}`}
        />,
      );
    }

    return items;
  };

  return (
    <div {...containerProps}>
      {renderRatingItems()}
    </div>
  );
};

export default Rating;