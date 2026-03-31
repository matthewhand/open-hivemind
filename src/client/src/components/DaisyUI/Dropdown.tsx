import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

type DropdownProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  color?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'none';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'none';
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
  hideArrow?: boolean;
};

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  position = 'bottom',
  color = 'ghost',
  size = 'md',
  isOpen: controlledIsOpen,
  onToggle,
  className = '',
  triggerClassName = '',
  contentClassName = '',
  disabled = false,
  hideArrow = false,
}) => {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isOpen = controlledIsOpen ?? uncontrolledIsOpen;
  const setIsOpen = onToggle ? () => onToggle(!isOpen) : setUncontrolledIsOpen;

  const handleToggle = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setIsOpen]);

  const positionClasses = {
    top: 'dropdown-top',
    bottom: 'dropdown-bottom',
    left: 'dropdown-left',
    right: 'dropdown-right',
  };

  const sizeClasses = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
    none: '',
  };

  const colorClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    ghost: 'btn-ghost',
    none: '',
  };

  return (
    <div className={`dropdown ${positionClasses[position]} ${className}`} ref={dropdownRef}>
      <div
        tabIndex={disabled ? -1 : 0}
        role="button"
        className={`btn ${sizeClasses[size]} ${colorClasses[color]} ${disabled ? 'btn-disabled opacity-50' : ''} ${triggerClassName}`}
        onClick={handleToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger}
        {!hideArrow && <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />}
      </div>
      {isOpen && (
        <ul tabIndex={0} className={`dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 z-50 ${contentClassName}`} role="menu">
          {children}
        </ul>
      )}
    </div>
  );
};

export default Dropdown;