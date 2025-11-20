import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
  Toggle
} from '../components/DaisyUI';
import {
  BellIcon as NotificationsIcon,
  Cog6ToothIcon as SettingsIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon as WarningIcon,
  XCircleIcon as ErrorIcon,
  InformationCircleIcon as InfoIcon,
  MagnifyingGlassIcon as SearchIcon,
  UsersIcon as GroupIcon,
} from '@heroicons/react/24/outline';

export interface NotificationConfig {
  enabled: boolean;
  groupingEnabled: boolean;
  smartDeliveryEnabled: boolean;
  channels: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
}

export interface SmartNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  category: string;
  read: boolean;
  dismissed: boolean;
}

const generateMockNotifications = (): SmartNotification[] => {
  const types: SmartNotification['type'][] = ['info', 'warning', 'error', 'success', 'critical'];
  const priorities: SmartNotification['priority'][] = ['low', 'medium', 'high', 'critical'];
  const sources = ['System Monitor', 'Security Scanner', 'Performance Analyzer'];

  return Array.from({ length: 10 }, (_, i) => ({
    id: `notif-${i}`,
    type: types[i % types.length],
    title: `${sources[i % sources.length]} Alert`,
    message: `Detected ${priorities[i % priorities.length]} priority event`,
    timestamp: new Date(Date.now() - i * 3600000),
    priority: priorities[i % priorities.length],
    source: sources[i % sources.length],
    category: 'system',
    read: i > 5,
    dismissed: false,
  }));
};

interface SmartNotificationSystemProps {
  onNotificationAction?: (action: string, notification: SmartNotification) => void;
}

export const SmartNotificationSystem: React.FC<SmartNotificationSystemProps> = ({ onNotificationAction }) => {
  const currentUser = useAppSelector(selectUser);
  const [config, setConfig] = useState<NotificationConfig>({
    enabled: true,
    groupingEnabled: true,
    smartDeliveryEnabled: true,
    channels: { email: true, push: true, inApp: true },
  });
  const [notifications, setNotifications] = useState<SmartNotification[]>(generateMockNotifications());
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const criticalCount = notifications.filter(n => n.priority === 'critical' && !n.read).length;

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = searchQuery === '' ||
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'all' || notification.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const handleAction = (action: string, notification: SmartNotification) => {
    setNotifications(prev => prev.map(n =>
      n.id === notification.id
        ? { ...n, read: action === 'acknowledge' || n.read, dismissed: action === 'dismiss' }
        : n
    ));
    onNotificationAction?.(action, notification);
  };

  const getIcon = (type: SmartNotification['type']) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'info': return <InfoIcon className={`${iconClass} text-info`} />;
      case 'warning': return <WarningIcon className={`${iconClass} text-warning`} />;
      case 'error': return <ErrorIcon className={`${iconClass} text-error`} />;
      case 'success': return <CheckCircleIcon className={`${iconClass} text-success`} />;
      case 'critical': return <ErrorIcon className={`${iconClass} text-error`} />;
      default: return <NotificationsIcon className={iconClass} />;
    }
  };

  const getPriorityColor = (priority: string): 'error' | 'warning' | 'info' | 'success' | 'neutral' => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'neutral';
    }
  };

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center min-h-96 p-6">
        <Card className="max-w-md text-center shadow-xl">
          <div className="p-8">
            <NotificationsIcon className="w-16 h-16 mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-bold mb-2">Smart Notifications</h2>
            <p className="opacity-70">Please log in to access notification features.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card className="shadow-xl border-l-4 border-primary">
        <div className="p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="indicator">
                {unreadCount > 0 && (
                  <span className={`indicator-item badge ${criticalCount > 0 ? 'badge-error' : 'badge-primary'}`}>
                    {unreadCount}
                  </span>
                )}
                <NotificationsIcon className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Smart Notification System</h2>
                <p className="text-sm opacity-70">
                  {unreadCount} unread • {config.groupingEnabled ? 'Grouping enabled' : 'Individual'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={config.groupingEnabled ? 'success' : 'neutral'} size="sm">
                {config.groupingEnabled ? 'Grouping On' : 'Grouping Off'}
              </Badge>
              <Button size="sm" variant="ghost" onClick={() => setShowConfig(!showConfig)}>
                <SettingsIcon className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Configuration */}
      {showConfig && (
        <Card className="shadow-xl">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Notification Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Smart Grouping</span>
                  <Toggle
                    checked={config.groupingEnabled}
                    onChange={(checked) => setConfig(prev => ({ ...prev, groupingEnabled: checked }))}
                  />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Smart Delivery</span>
                  <Toggle
                    checked={config.smartDeliveryEnabled}
                    onChange={(checked) => setConfig(prev => ({ ...prev, smartDeliveryEnabled: checked }))}
                  />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Email Notifications</span>
                  <Toggle
                    checked={config.channels.email}
                    onChange={(checked) => setConfig(prev => ({
                      ...prev,
                      channels: { ...prev.channels, email: checked }
                    }))}
                  />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Push Notifications</span>
                  <Toggle
                    checked={config.channels.push}
                    onChange={(checked) => setConfig(prev => ({
                      ...prev,
                      channels: { ...prev.channels, push: checked }
                    }))}
                  />
                </label>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="shadow-xl">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 opacity-50" />
              <Input
                className="pl-10"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              options={[
                { value: 'all', label: 'All Priorities' },
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' }
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <Card className="shadow-xl">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">
            Notifications ({filteredNotifications.length})
          </h3>
          <div className="space-y-2">
            {filteredNotifications.slice(0, 20).map(notification => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-3 border border-base-300 rounded-lg ${!notification.read ? 'bg-primary/5' : ''
                  }`}
              >
                <div className="mt-1">{getIcon(notification.type)}</div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold">{notification.title}</span>
                    <Badge variant={getPriorityColor(notification.priority)} size="sm">
                      {notification.priority}
                    </Badge>
                  </div>
                  <p className="text-sm opacity-70 mb-1">{notification.message}</p>
                  <p className="text-xs opacity-50">
                    {notification.timestamp.toLocaleTimeString()} • {notification.source}
                  </p>
                </div>
                <div className="flex gap-1">
                  {!notification.read && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction('acknowledge', notification)}
                    >
                      Ack
                    </Button>
                  )}
                  {!notification.dismissed && (
                    <Button
                      size="sm"
                      variant="error"
                      onClick={() => handleAction('dismiss', notification)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SmartNotificationSystem;