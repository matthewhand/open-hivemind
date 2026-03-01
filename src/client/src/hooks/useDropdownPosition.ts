import { useState, useEffect, RefObject } from 'react';

type DropdownPosition = 'top' | 'bottom' | 'left' | 'right';

interface UseDropdownPositionProps {
  isOpen: boolean;
  dropdownRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  defaultPosition?: DropdownPosition;
}

export const useDropdownPosition = ({
  isOpen,
  dropdownRef,
  contentRef,
  defaultPosition = 'bottom',
}: UseDropdownPositionProps) => {
  const [autoPosition, setAutoPosition] = useState<DropdownPosition>(defaultPosition);
  const [autoAlign, setAutoAlign] = useState('');

  useEffect(() => {
    if (isOpen && contentRef.current && dropdownRef.current) {
      const measurePosition = () => {
        if (!contentRef.current || !dropdownRef.current) return;

        const contentRect = contentRef.current.getBoundingClientRect();
        const triggerRect = dropdownRef.current.getBoundingClientRect();

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let newPosition = defaultPosition;
        let newAlign = '';

        // Check if the dropdown overflows the right edge of the window
        if (contentRect.right > windowWidth) {
          newAlign = 'dropdown-end';
        }

        // Check if the dropdown overflows the bottom edge of the window
        // Only flip to top if there's enough space above the trigger
        if (contentRect.bottom > windowHeight && triggerRect.top > contentRect.height) {
          newPosition = 'top';
        }

        setAutoPosition(newPosition);
        setAutoAlign(newAlign);
      };

      // Measure after render
      requestAnimationFrame(() => {
        requestAnimationFrame(measurePosition);
      });
    } else {
      // Reset when closed
      setAutoPosition(defaultPosition);
      setAutoAlign('');
    }
  }, [isOpen, defaultPosition]);

  return { autoPosition, autoAlign };
};

export default useDropdownPosition;
