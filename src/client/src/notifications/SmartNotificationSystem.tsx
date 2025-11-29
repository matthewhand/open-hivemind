import React, { createContext, useContext, useState, useEffect } from 'react';
import { Card, Badge, Button, ToastNotification } from '../components/DaisyUI';
import {
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  category: 'system' | 'bot' | 'security' | 'performance';
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const SmartNotificationSystem: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Mock initial notifications
  useEffect(() => {
    const initialNotifications: Notification[] = [
      {
        id: '1',
        title: 'System Update',
        message: 'System maintenance scheduled for tonight.',
        type: 'info',
        timestamp: new Date(),
        read: false,
        category: 'system'
      },
      {
        id: '2',
        title: 'Bot Deployment',
        message: 'Customer Support Bot deployed successfully.',
        type: 'success',
        timestamp: new Date(Date.now() - 3600000),
        read: true,
        category: 'bot'
      }
    ];
    setNotifications(initialNotifications);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircleIcon className="w-5 h-5 text-success" />;
      case 'warning': return <ExclamationTriangleIcon className="w-5 h-5 text-warning" />;
      case 'error': return <XMarkIcon className="w-5 h-5 text-error" />;
      default: return <InformationCircleIcon className="w-5 h-5 text-info" />;
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearAll,
      removeNotification
    }}>
      {children}

      {/* Notification Bell & Panel */}
      <div className="fixed top-4 right-4 z-50">
        <div className="relative">
          <Button
            variant="ghost"
            className="btn-circle bg-base-100 shadow-lg border border-base-200"
            onClick={() => setIsOpen(!isOpen)}
          >
            <BellIcon className="w-6 h-6" />
            {unreadCount > 0 && (
              <Badge
                variant="error"
                size="sm"
                className="absolute -top-1 -right-1 animate-pulse"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>

          {isOpen && (
            <Card className="absolute right-0 mt-2 w-80 sm:w-96 shadow-2xl bg-base-100 border border-base-200 max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-base-200 flex justify-between items-center bg-base-200/50">
                <h3 className="font-bold">Notifications</h3>
                <div className="flex gap-2">
                  <Button size="xs" variant="ghost" onClick={markAllAsRead} disabled={unreadCount === 0}>
                    Mark all read
                  </Button>
                  <Button size="xs" variant="ghost" onClick={clearAll} disabled={notifications.length === 0}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="overflow-y-auto flex-grow p-2 space-y-2">
                {notifications.length === 0 ? (
                  <div className="text-center p-8 opacity-50">
                    <BellIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border transition-all hover:bg-base-200 relative group ${notification.read ? 'border-transparent opacity-70' : 'border-primary/20 bg-primary/5'
                        }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div className="mt-1 flex-shrink-0">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex justify-between items-start">
                            <p className={`font-medium text-sm ${!notification.read && 'text-primary'}`}>
                              {notification.title}
                            </p>
                            <span className="text-xs opacity-50 whitespace-nowrap ml-2">
                              {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs opacity-80 mt-1 line-clamp-2">{notification.message}</p>
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-base-300 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within SmartNotificationSystem');
  return context;
};

export default SmartNotificationSystem;