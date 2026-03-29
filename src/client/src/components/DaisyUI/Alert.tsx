import React, { useState } from 'react';

type AlertStatus = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  status?: AlertStatus;
  variant?: AlertStatus; // Alias for status
  message?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  children?: React.ReactNode;
  className?: string;
}

const statusClasses = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
};

export const Alert: React.FC<AlertProps> = ({
  status,
  variant,
  message,
  icon,
  onClose,
  children,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const activeStatus = status || variant || 'info';

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div role="alert" className={`alert ${statusClasses[activeStatus]} ${className}`}>
      {icon}
      {message && <span>{message}</span>}
      {children}
      {onClose && (
        <button
          aria-label="Close alert"
          onClick={handleClose}
          className="btn btn-sm btn-circle btn-ghost"
        >
          ✕
        </button>
      )}
    </div>
  );
};
