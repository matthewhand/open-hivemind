import type { ReactNode} from 'react';
import React, { useEffect, useRef } from 'react';

interface DrawerProps {
  children: ReactNode;
  sideContent: ReactNode;
  drawerId: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const Drawer: React.FC<DrawerProps> = ({
  children,
  sideContent,
  drawerId,
  isOpen = false,
  onClose = () => {},
}) => {
  const drawerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) {return;}

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleOverlayClick = (e: Event) => {
      if (e.target === drawer) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    drawer.addEventListener('click', handleOverlayClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      drawer.removeEventListener('click', handleOverlayClick);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (drawerRef.current) {
      drawerRef.current.checked = isOpen;
    }
  }, [isOpen]);

  return (
    <div className="drawer" ref={drawerRef}>
      <input
        id={drawerId}
        type="checkbox"
        className="drawer-toggle"
        aria-label="Navigation drawer"
        aria-expanded={isOpen}
      />
      <div className="drawer-content">
        {children}
      </div>
      <div className="drawer-side">
        <label
          htmlFor={drawerId}
          className="drawer-overlay"
          aria-label="Close navigation drawer"
          onClick={onClose}
        ></label>
        <div className="p-4 w-80 min-h-full bg-base-100 text-base-content">
          {sideContent}
        </div>
      </div>
    </div>
  );
};

export default Drawer;