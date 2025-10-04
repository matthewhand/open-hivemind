import React, { useState, useCallback } from 'react';

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
  icon?: string;
  disabled?: boolean;
  className?: string;
}

export interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpenItems?: string[];
  className?: string;
  variant?: 'default' | 'bordered' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  iconPosition?: 'left' | 'right';
  onItemToggle?: (itemId: string, isOpen: boolean) => void;
}

const Accordion: React.FC<AccordionProps> = ({
  items,
  allowMultiple = false,
  defaultOpenItems = [],
  className = '',
  variant = 'default',
  size = 'md',
  iconPosition = 'left',
  onItemToggle
}) => {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(defaultOpenItems));

  const handleToggle = useCallback((itemId: string) => {
    const isOpen = openItems.has(itemId);

    if (allowMultiple) {
      setOpenItems(prev => {
        const newSet = new Set(prev);
        if (isOpen) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        return newSet;
      });
    } else {
      setOpenItems(prev => {
        const newSet: Set<string> = new Set();
        if (!isOpen) {
          newSet.add(itemId);
        }
        return newSet;
      });
    }

    onItemToggle?.(itemId, !isOpen);
  }, [openItems, allowMultiple, onItemToggle]);

  const getCollapseClasses = (item: AccordionItem) => {
    const baseClasses = 'collapse';

    const variantClasses = {
      default: '',
      bordered: 'collapse-bordered',
      ghost: 'collapse-ghost'
    };

    const sizeClasses = {
      sm: 'collapse-sm',
      md: '',
      lg: 'collapse-lg'
    };

    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${item.className || ''}`.trim();
  };

  const getTitleClasses = () => {
    const baseClasses = 'collapse-title text-xl font-medium';

    const sizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg'
    };

    return `${baseClasses} ${sizeClasses[size]}`;
  };

  const getContentClasses = () => {
    const baseClasses = 'collapse-content';

    const sizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg'
    };

    return `${baseClasses} ${sizeClasses[size]}`;
  };

  return (
    <div className={`accordion ${className}`}>
      {items.map((item) => {
        const isOpen = openItems.has(item.id);
        const isDisabled = item.disabled || false;

        return (
          <div key={item.id} className={getCollapseClasses(item)}>
            <input
              type="checkbox"
              checked={isOpen}
              onChange={() => !isDisabled && handleToggle(item.id)}
              disabled={isDisabled}
              aria-expanded={isOpen}
              aria-controls={`accordion-content-${item.id}`}
              id={`accordion-toggle-${item.id}`}
              className="peer"
            />

            <div
              className={getTitleClasses()}
              role="button"
              tabIndex={isDisabled ? -1 : 0}
              onClick={() => !isDisabled && handleToggle(item.id)}
              onKeyDown={(e) => {
                if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleToggle(item.id);
                }
              }}
              aria-expanded={isOpen}
              aria-controls={`accordion-content-${item.id}`}
              aria-disabled={isDisabled}
            >
              <div className={`flex items-center gap-2 ${iconPosition === 'right' ? 'justify-between' : ''}`}>
                {iconPosition === 'left' && item.icon && (
                  <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                )}
                <span className="flex-1">{item.title}</span>
                {iconPosition === 'right' && item.icon && (
                  <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                )}
              </div>
            </div>

            <div
              className={getContentClasses()}
              id={`accordion-content-${item.id}`}
              role="region"
              aria-labelledby={`accordion-toggle-${item.id}`}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Accordion;