/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-refresh/only-export-components, no-empty, no-case-declarations */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  position = 'top-right',
  maxToasts = 5, 
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toastData: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: Toast = {
      id,
      duration: 5000, // 5 seconds default
      ...toastData,
    };

    setToasts(prev => {
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
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
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
      <div className={`fixed z-50 space-y-2 ${getPositionClasses()}`}>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
            position={position}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove, position }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

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
      return '✅';
    case 'error':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    default:
      return 'ℹ️';
    }
  };

  return (
    <div
      className={`
        alert ${getAlertClass()} shadow-lg max-w-md transform transition-all duration-300 ease-in-out
        ${isVisible && !isRemoving 
      ? 'translate-x-0 opacity-100 scale-100' 
      : position.includes('right') 
        ? 'translate-x-full opacity-0 scale-95' 
        : '-translate-x-full opacity-0 scale-95'
    }
      `}
    >
      <div className="flex items-start space-x-3 flex-1">
        <span className="text-xl flex-shrink-0">{getIcon()}</span>
        
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{toast.title}</div>
          {toast.message && (
            <div className="text-sm opacity-80 mt-1">{toast.message}</div>
          )}
          
          {toast.actions && toast.actions.length > 0 && (
            <div className="flex gap-2 mt-2">
              {toast.actions.map((action, index) => (
                <button
                  key={index}
                  className={`btn btn-xs ${
                    action.style === 'primary' ? 'btn-primary' :
                      action.style === 'secondary' ? 'btn-secondary' :
                        'btn-ghost'
                  }`}
                  onClick={() => {
                    action.action();
                    handleRemove();
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          className="btn btn-ghost btn-xs btn-circle"
          onClick={handleRemove}
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// Convenience hooks for different toast types
export const useSuccessToast = () => {
  const { addToast } = useToast();
  return useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'success', title, message, ...options });
  }, [addToast]);
};

export const useErrorToast = () => {
  const { addToast } = useToast();
  return useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'error', title, message, ...options });
  }, [addToast]);
};

export const useWarningToast = () => {
  const { addToast } = useToast();
  return useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'warning', title, message, ...options });
  }, [addToast]);
};

export const useInfoToast = () => {
  const { addToast } = useToast();
  return useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'info', title, message, ...options });
  }, [addToast]);
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
      >
        <div className="indicator">
          <span className="text-xl">🔔</span>
          {unreadCount > 0 && (
            <span className="badge badge-primary badge-xs indicator-item">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
      
      {isOpen && (
        <div className="dropdown-content z-[1] card card-compact w-80 p-2 shadow bg-base-100">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h3 className="card-title text-sm">Notifications</h3>
              {toasts.length > 0 && (
                <button 
                  className="btn btn-ghost btn-xs"
                  onClick={clearAll}
                >
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
                    className={`alert ${toast.type === 'success' ? 'alert-success' : 
                      toast.type === 'error' ? 'alert-error' :
                        toast.type === 'warning' ? 'alert-warning' : 'alert-info'} 
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