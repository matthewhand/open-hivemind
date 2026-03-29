/* eslint-disable  */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
    style?: 'primary' | 'secondary' | 'ghost';
  }>;
  persistent?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'top-right',
  maxToasts = 5,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (toastData: Omit<Toast, 'id'>) => {
      const id = `toast-${Date.now()}-${uuidv4()}`;
      const toast: Toast = {
        id,
        duration: toastData.type === 'error' ? 8000 : 5000,
        ...toastData,
      };

      setToasts((prev) => {
        const newToasts = [toast, ...prev];
        // Limit number of toasts
        return newToasts.slice(0, maxToasts);
      });

      // Auto remove after duration (unless persistent)
      if (!toast.persistent && toast.duration && toast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, toast.duration);
      }

      return id;
    },
    [maxToasts]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}

      {/* Toast Container */}
      <div
        className={`fixed z-50 space-y-2 ${getPositionClasses()} pointer-events-none`}
        aria-live="polite"
        aria-label="Notifications"
        role="region"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} position={position} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
  position:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove, position }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Progress bar animation for auto-dismiss
    if (!toast.persistent && toast.duration && toast.duration > 0) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
        setProgress(remaining);

        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 50); // Update every 50ms for smooth animation

      return () => clearInterval(interval);
    }
  }, [toast.duration, toast.persistent]);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300); // Match animation duration
  };

  const getAlertClass = () => {
    switch (toast.type) {
      case 'success':
        return 'alert-success';
      case 'error':
        return 'alert-error';
      case 'warning':
        return 'alert-warning';
      case 'info':
        return 'alert-info';
      default:
        return 'alert-info';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'info':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getRole = () => {
    switch (toast.type) {
      case 'error':
      case 'warning':
        return 'alert';
      case 'success':
      case 'info':
      default:
        return 'status';
    }
  };

  const getAriaLive = () => {
    switch (toast.type) {
      case 'error':
      case 'warning':
        return 'assertive';
      case 'success':
      case 'info':
      default:
        return 'polite';
    }
  };

  const getProgressBarColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-success';
      case 'error':
        return 'bg-error';
      case 'warning':
        return 'bg-warning';
      case 'info':
        return 'bg-info';
      default:
        return 'bg-info';
    }
  };

  return (
    <div
      role={getRole()}
      aria-live={getAriaLive()}
      aria-atomic="true"
      className={`
        alert ${getAlertClass()} shadow-lg max-w-md transform transition-all duration-300 ease-in-out relative overflow-hidden
        ${
          isVisible && !isRemoving
            ? 'translate-x-0 opacity-100 scale-100'
            : position.includes('right')
              ? 'translate-x-full opacity-0 scale-95'
              : '-translate-x-full opacity-0 scale-95'
        }
      `}
    >
      {/* Progress bar for auto-dismiss */}
      {!toast.persistent && toast.duration && toast.duration > 0 && (
        <div
          className="absolute bottom-0 left-0 h-1 transition-all duration-100 ease-linear opacity-60"
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        >
          <div className={`h-full ${getProgressBarColor()}`} />
        </div>
      )}

      <div className="flex items-start space-x-3 flex-1">
        {getIcon()}

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm" id={`toast-title-${toast.id}`}>
            {toast.title}
          </div>
          {toast.message && (
            <div className="text-sm opacity-80 mt-1" id={`toast-message-${toast.id}`}>
              {toast.message}
            </div>
          )}

          {toast.actions && toast.actions.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap" role="group" aria-label="Toast actions">
              {toast.actions.map((action, index) => (
                <button
                  key={index}
                  className={`btn btn-xs ${
                    action.style === 'primary'
                      ? 'btn-primary'
                      : action.style === 'secondary'
                        ? 'btn-secondary'
                        : 'btn-ghost'
                  }`}
                  onClick={() => {
                    action.action();
                    handleRemove();
                  }}
                  aria-label={action.label}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="btn btn-ghost btn-xs btn-circle flex-shrink-0"
          onClick={handleRemove}
          aria-label={`Dismiss ${toast.type} notification: ${toast.title}`}
          title="Dismiss notification"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Convenience hooks for different toast types
export const useSuccessToast = () => {
  const { addToast } = useToast();
  return useCallback(
    (title: string, message?: string, options?: Partial<Toast>) => {
      return addToast({ type: 'success', title, message, ...options });
    },
    [addToast]
  );
};

export const useErrorToast = () => {
  const { addToast } = useToast();
  return useCallback(
    (title: string, message?: string, options?: Partial<Toast>) => {
      return addToast({ type: 'error', title, message, ...options });
    },
    [addToast]
  );
};

export const useWarningToast = () => {
  const { addToast } = useToast();
  return useCallback(
    (title: string, message?: string, options?: Partial<Toast>) => {
      return addToast({ type: 'warning', title, message, ...options });
    },
    [addToast]
  );
};

export const useInfoToast = () => {
  const { addToast } = useToast();
  return useCallback(
    (title: string, message?: string, options?: Partial<Toast>) => {
      return addToast({ type: 'info', title, message, ...options });
    },
    [addToast]
  );
};

// Notification Center Component
export const NotificationCenter: React.FC = () => {
  const { toasts, clearAll } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = toasts.length;

  return (
    <div className="dropdown dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-ghost btn-circle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications" aria-haspopup="true" aria-expanded={isOpen}
      >
        <div className="indicator">
          <span className="text-xl" aria-hidden="true">🔔</span>
          {unreadCount > 0 && (
            <span className="badge badge-primary badge-xs indicator-item">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="dropdown-content z-[1] card card-compact w-80 p-2 shadow bg-base-100" role="region" aria-label="Notification center">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h3 className="card-title text-sm">Notifications</h3>
              {toasts.length > 0 && (
                <button className="btn btn-ghost btn-xs" onClick={clearAll}>
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {toasts.length === 0 ? (
                <div className="text-center py-4 text-base-content/60">
                  <span className="text-2xl block mb-2">📭</span>
                  No notifications
                </div>
              ) : (
                toasts.map((toast) => (
                  <div
                    key={toast.id}
                    className={`alert ${
                      toast.type === 'success'
                        ? 'alert-success'
                        : toast.type === 'error'
                          ? 'alert-error'
                          : toast.type === 'warning'
                            ? 'alert-warning'
                            : 'alert-info'
                    }
                                alert-sm`}
                  >
                    <div className="text-xs">
                      <div className="font-semibold">{toast.title}</div>
                      {toast.message && <div className="opacity-80">{toast.message}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main ToastNotification component that wraps ToastProvider
const ToastNotification = ToastProvider as typeof ToastProvider & {
  useToast: typeof useToast;
  useSuccessToast: typeof useSuccessToast;
  useErrorToast: typeof useErrorToast;
  useWarningToast: typeof useWarningToast;
  useInfoToast: typeof useInfoToast;
  Notifications: typeof NotificationCenter;
};

ToastNotification.useToast = useToast;
ToastNotification.useSuccessToast = useSuccessToast;
ToastNotification.useErrorToast = useErrorToast;
ToastNotification.useWarningToast = useWarningToast;
ToastNotification.useInfoToast = useInfoToast;
ToastNotification.Notifications = NotificationCenter;

export default ToastNotification;
