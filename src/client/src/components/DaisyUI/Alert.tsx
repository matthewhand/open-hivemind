import React, { useState } from 'react';

type AlertStatus = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  status: AlertStatus;
  message: string;
  icon?: React.ReactNode;
  onClose?: () => void;
}

const statusClasses = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
};

export const Alert: React.FC<AlertProps> = ({ status, message, icon, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

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
    <div role="alert" className={`alert ${statusClasses[status]}`}>
      {icon}
      <span>{message}</span>
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