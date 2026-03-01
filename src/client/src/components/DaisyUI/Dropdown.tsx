import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';

type DropdownProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  color?: 'primary' | 'secondary' | 'accent' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
};

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  position = 'bottom',
  color = 'ghost',
  size = 'md',
  isOpen: controlledIsOpen,
  onToggle,
}) => {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLUListElement>(null);

  const isOpen = controlledIsOpen ?? uncontrolledIsOpen;
  const setIsOpen = onToggle ? () => onToggle(!isOpen) : setUncontrolledIsOpen;

  const { autoPosition, autoAlign } = useDropdownPosition({
    isOpen,
    dropdownRef,
    contentRef,
    defaultPosition: position,
  });

  const handleToggle = () => {
    setIsOpen(!isOpen);
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
  };

  const colorClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    ghost: 'btn-ghost',
  };

  return (
    <div className={`dropdown ${positionClasses[autoPosition]} ${autoAlign}`} ref={dropdownRef}>
      <div tabIndex={0} role="button" className={`btn ${sizeClasses[size]} ${colorClasses[color]}`} onClick={handleToggle}>
        {trigger}
        <ChevronDownIcon className="h-5 w-5" />
      </div>
      {isOpen && (
        <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52" ref={contentRef}>
          {children}
        </ul>
      )}
    </div>
  );
};

export default Dropdown;
