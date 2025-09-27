import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Chip,
  Grid,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Avatar,
  Badge,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  FormControlLabel,
  Switch,
  TextField,
  InputAdornment,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  Notifications as NotificationsIcon,
  NotificationsActive as ActiveIcon,
  NotificationsOff as OffIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Schedule as TimeIcon,
  Group as GroupIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  MarkEmailRead as MarkReadIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  Share as ShareIcon,
  TrendingUp as TrendIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { AnimatedBox } from '../animations/AnimationComponents';

export interface NotificationConfig {
  enabled: boolean;
  grouping: {
    enabled: boolean;
    algorithm: 'similarity' | 'time-window' | 'severity' | 'source';
    maxGroupSize: number;
    timeWindow: number; // seconds
    similarityThreshold: number;
  };
  smartDelivery: {
    enabled: boolean;
    deliveryWindow: { start: number; end: number }; // hours
    priorityThreshold: 'low' | 'medium' | 'high' | 'critical';
    userActivity: boolean;
    quietHours: boolean;
  };
  channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
    webhook: boolean;
    inApp: boolean;
  };
  personalization: {
    enabled: boolean;
    learningRate: number;
    adaptationPeriod: number; // days
    userPreferences: Record<string, boolean>;
  };
  rateLimiting: {
    enabled: boolean;
    maxPerHour: number;
    maxPerDay: number;
    burstLimit: number;
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
  category: 'system' | 'security' | 'performance' | 'user' | 'maintenance';
  tags: string[];
  metadata: Record<string, unknown>;
  grouping: {
    groupId?: string;
    isGrouped: boolean;
    groupSize: number;
    similarityScore: number;
  };
  delivery: {
    channels: NotificationConfig['channels'];
    scheduledFor?: Date;
    deliveredAt?: Date;
    readAt?: Date;
    dismissedAt?: Date;
  };
  smartFeatures: {
    predictedRelevance: number;
    optimalDeliveryTime: Date;
    userEngagement: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    urgency: number;
  };
  userActions: {
    canAcknowledge: boolean;
    canDismiss: boolean;
    canReply: boolean;
    canShare: boolean;
    actions: UserAction[];
  };
}

export interface UserAction {
  id: string;
  name: string;
  type: 'acknowledge' | 'dismiss' | 'reply' | 'share' | 'custom';
  handler: () => Promise<void>;
  enabled: boolean;
}

export interface NotificationGroup {
  id: string;
  notifications: SmartNotification[];
  summary: {
    title: string;
    message: string;
    count: number;
    types: SmartNotification['type'][];
    priorities: SmartNotification['priority'][];
    latest: Date;
    oldest: Date;
  };
  grouping: {
    algorithm: string;
    similarityScore: number;
    commonTags: string[];
    commonSource: string;
  };
  delivery: {
    optimalTime: Date;
    channels: NotificationConfig['channels'];
    batchSize: number;
  };
}

export interface SmartNotificationState {
  notifications: SmartNotification[];
  groups: NotificationGroup[];
  config: NotificationConfig;
  unreadCount: number;
  criticalCount: number;
  deliveryQueue: SmartNotification[];
  analytics: NotificationAnalytics;
  userPreferences: UserNotificationPreferences;
}

export interface NotificationAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalDismissed: number;
  byType: Record<SmartNotification['type'], number>;
  byPriority: Record<SmartNotification['priority'], number>;
  byChannel: Record<keyof NotificationConfig['channels'], number>;
  engagementRate: number;
  averageResponseTime: number;
  smartGroupingEfficiency: number;
  userSatisfaction: number;
}

export interface UserNotificationPreferences {
  userId: string;
  channels: Partial<NotificationConfig['channels']>;
  priorities: SmartNotification['priority'][];
  categories: SmartNotification['category'][];
  quietHours: { start: number; end: number }; // 24-hour format
  deliveryWindows: { start: number; end: number }[];
  maxPerDay: number;
  groupingEnabled: boolean;
  smartDeliveryEnabled: boolean;
  learningEnabled: boolean;
}

const defaultConfig: NotificationConfig = {
  enabled: true,
  grouping: {
    enabled: true,
    algorithm: 'similarity',
    maxGroupSize: 10,
    timeWindow: 300, // 5 minutes
    similarityThreshold: 0.75,
  },
  smartDelivery: {
    enabled: true,
    deliveryWindow: { start: 8, end: 20 }, // 8 AM to 8 PM
    priorityThreshold: 'medium',
    userActivity: true,
    quietHours: true,
  },
  channels: {
    email: true,
    push: true,
    sms: false,
    webhook: false,
    inApp: true,
  },
  personalization: {
    enabled: true,
    learningRate: 0.1,
    adaptationPeriod: 7,
    userPreferences: {},
  },
  rateLimiting: {
    enabled: true,
    maxPerHour: 50,
    maxPerDay: 200,
    burstLimit: 10,
  },
};

// Mock notifications for demonstration
const generateMockNotifications = (): SmartNotification[] => {
  const notifications: SmartNotification[] = [];
  const now = new Date();
  
  for (let i = 0; i < 25; i++) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const types: SmartNotification['type'][] = ['info', 'warning', 'error', 'success', 'critical'];
    const priorities: SmartNotification['priority'][] = ['low', 'medium', 'high', 'critical'];
    const categories: SmartNotification['category'][] = ['system', 'security', 'performance', 'user', 'maintenance'];
    const sources = ['System Monitor', 'Security Scanner', 'Performance Analyzer', 'User Manager', 'Maintenance Scheduler'];
    
    const type = types[Math.floor(Math.random() * types.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    
    const notification: SmartNotification = {
      id: `notification-${Date.now()}-${i}`,
      type,
      title: `${source} Alert`,
      message: `Detected ${priority} priority ${type} event in ${category} category`,
      timestamp,
      priority,
      source,
      category,
      tags: [type, category, priority, 'automated'],
      metadata: { severity_score: Math.random() * 100 },
      grouping: {
        isGrouped: Math.random() > 0.7,
        groupSize: Math.floor(Math.random() * 5) + 1,
        similarityScore: Math.random(),
      },
      delivery: {
        channels: {
          email: Math.random() > 0.3,
          push: Math.random() > 0.5,
          sms: Math.random() > 0.9,
          webhook: Math.random() > 0.7,
          inApp: true,
        },
        deliveredAt: timestamp,
        readAt: Math.random() > 0.6 ? timestamp : undefined,
        dismissedAt: Math.random() > 0.8 ? timestamp : undefined,
      },
      smartFeatures: {
        predictedRelevance: 0.7 + Math.random() * 0.3,
        optimalDeliveryTime: new Date(timestamp.getTime() + Math.random() * 3600000),
        userEngagement: Math.random(),
        sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)] as SmartNotification['smartFeatures']['sentiment'],
        urgency: Math.random() * 10,
      },
      userActions: {
        canAcknowledge: true,
        canDismiss: true,
        canReply: type === 'info',
        canShare: true,
        actions: [
          {
            id: 'ack-001',
            name: 'Acknowledge',
            type: 'acknowledge',
            handler: async () => console.log('Acknowledged'),
            enabled: true,
          },
          {
            id: 'dismiss-001',
            name: 'Dismiss',
            type: 'dismiss',
            handler: async () => console.log('Dismissed'),
            enabled: true,
          },
        ],
      },
    };
    
    notifications.push(notification);
  }
  
  return notifications;
};

const generateMockGroups = (notifications: SmartNotification[]): NotificationGroup[] => {
  const groups: NotificationGroup[] = [];
  
  // Group by severity and time window
  const severityGroups: Record<string, SmartNotification[]> = {};
  const timeWindow = 5 * 60 * 1000; // 5 minutes
  
  notifications.forEach(notification => {
    if (!notification.grouping.isGrouped) return;
    
    const key = `${notification.priority}-${Math.floor(notification.timestamp.getTime() / timeWindow)}`;
    
    if (!severityGroups[key]) {
      severityGroups[key] = [];
    }
    severityGroups[key].push(notification);
  });
  
  Object.entries(severityGroups).forEach(([key, groupNotifications]) => {
    if (groupNotifications.length > 1) {
      const priorities = [...new Set(groupNotifications.map(n => n.priority))];
      const types = [...new Set(groupNotifications.map(n => n.type))];
      const commonTags = [...new Set(groupNotifications.flatMap(n => n.tags))];
      
      groups.push({
        id: `group-${key}`,
        notifications: groupNotifications,
        summary: {
          title: `${groupNotifications.length} ${groupNotifications[0].priority} priority notifications`,
          message: `Multiple ${groupNotifications[0].category} events detected`,
          count: groupNotifications.length,
          types,
          priorities,
          latest: new Date(Math.max(...groupNotifications.map(n => n.timestamp.getTime()))),
          oldest: new Date(Math.min(...groupNotifications.map(n => n.timestamp.getTime()))),
        },
        grouping: {
          algorithm: 'similarity',
          similarityScore: 0.8,
          commonTags,
          commonSource: groupNotifications[0].source,
        },
        delivery: {
          optimalTime: new Date(Date.now() + 300000), // 5 minutes from now
          channels: {
            email: groupNotifications.some(n => n.delivery.channels.email),
            push: groupNotifications.some(n => n.delivery.channels.push),
            sms: groupNotifications.some(n => n.delivery.channels.sms),
            webhook: groupNotifications.some(n => n.delivery.channels.webhook),
            inApp: true,
          },
          batchSize: groupNotifications.length,
        },
      });
    }
  });
  
  return groups;
};

interface SmartNotificationSystemProps {
  onNotificationAction?: (action: string, notification: SmartNotification) => void;
}

export const SmartNotificationSystem: React.FC<SmartNotificationSystemProps> = ({ onNotificationAction }) => {
  const currentUser = useAppSelector(selectUser);
  const [config, setConfig] = useState<NotificationConfig>(defaultConfig);
  const [notifications, setNotifications] = useState<SmartNotification[]>(generateMockNotifications());
  const [groups, setGroups] = useState<NotificationGroup[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<SmartNotification | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [filterPriority, setFilterPriority] = useState<SmartNotification['priority'] | 'all'>('all');
  const [filterType, setFilterType] = useState<SmartNotification['type'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Generate smart groups
  useEffect(() => {
    if (config.grouping.enabled) {
      const newGroups = generateMockGroups(notifications);
      setGroups(newGroups);
    } else {
      setGroups([]);
    }
  }, [notifications, config.grouping.enabled]);

  // Calculate unread and critical counts
  const unreadCount = notifications.filter(n => !n.delivery.readAt).length;
  const criticalCount = notifications.filter(n => n.priority === 'critical' && !n.delivery.readAt).length;

  // Filter notifications based on search and filters
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = searchQuery === '' || 
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.source.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = filterPriority === 'all' || notification.priority === filterPriority;
    const matchesType = filterType === 'all' || notification.type === filterType;
    
    return matchesSearch && matchesPriority && matchesType;
  });

  const handleNotificationAction = async (action: string, notification: SmartNotification) => {
    setSnackbarMessage(`Notification ${action}d successfully`);
    setSnackbarOpen(true);
    
    // Update notification status
    setNotifications(prev => prev.map(n =>
      n.id === notification.id
        ? {
            ...n,
            delivery: {
              ...n.delivery,
              readAt: action === 'acknowledge' ? new Date() : n.delivery.readAt,
              dismissedAt: action === 'dismiss' ? new Date() : n.delivery.dismissedAt,
            },
          }
        : n
    ));
    
    if (onNotificationAction) {
      onNotificationAction(action, notification);
    }
  };

  const handleGroupAction = async (action: string, group: NotificationGroup) => {
    // Apply action to all notifications in group
    for (const notification of group.notifications) {
      await handleNotificationAction(action, notification);
    }
  };

  const toggleGrouping = () => {
    setConfig(prev => ({
      ...prev,
      grouping: {
        ...prev.grouping,
        enabled: !prev.grouping.enabled,
      },
    }));
  };

  const updateGroupingAlgorithm = (algorithm: string) => {
    setConfig(prev => ({
      ...prev,
      grouping: {
        ...prev.grouping,
        algorithm: algorithm as NotificationConfig['grouping']['algorithm'],
      },
    }));
  };

  const updateSmartDelivery = (enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      smartDelivery: {
        ...prev.smartDelivery,
        enabled,
      },
    }));
  };

  const scheduleOptimalDelivery = (notification: SmartNotification) => {
    const optimalTime = notification.smartFeatures.optimalDeliveryTime;
    setSnackbarMessage(`Notification scheduled for optimal delivery at ${optimalTime.toLocaleTimeString()}`);
    setSnackbarOpen(true);
  };

  const getNotificationIcon = (type: SmartNotification['type']) => {
    switch (type) {
      case 'info': return <InfoIcon />;
      case 'warning': return <WarningIcon />;
      case 'error': return <ErrorIcon />;
      case 'success': return <CheckIcon />;
      case 'critical': return <ErrorIcon color="error" />;
      default: return <NotificationsIcon />;
    }
  };

  const getNotificationColor = (priority: SmartNotification['priority']) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  if (!currentUser) {
    return (
      <AnimatedBox
        animation={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
        sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}
      >
        <Card sx={{ maxWidth: 400, textAlign: 'center' }}>
          <CardContent>
            <NotificationsIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Smart Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please log in to access smart notification features.
            </Typography>
          </CardContent>
        </Card>
      </AnimatedBox>
    );
  }

  return (
    <AnimatedBox
      animation={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
      sx={{ width: '100%' }}
    >
      {/* Smart Notifications Header */}
      <Card sx={{ mb: 3, borderLeft: 4, borderColor: 'primary.main' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <Badge badgeContent={unreadCount} color={criticalCount > 0 ? 'error' : 'primary'}>
                <NotificationsIcon color="primary" fontSize="large" />
              </Badge>
              <Box>
                <Typography variant="h6">
                  Smart Notification System
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {unreadCount} unread • {groups.length} groups • {config.grouping.enabled ? 'Smart Grouping' : 'Individual'}
                </Typography>
              </Box>
            </Box>
            
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={config.grouping.enabled ? 'Grouping On' : 'Grouping Off'}
                size="small"
                color={config.grouping.enabled ? 'success' : 'default'}
                onClick={toggleGrouping}
              />
              <IconButton onClick={() => setShowConfigDialog(true)}>
                <SettingsIcon />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as SmartNotification['priority'] | 'all')}
                >
                  <MenuItem value="all">All Priorities</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as SmartNotification['type'] | 'all')}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="success">Success</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Smart Groups */}
      {config.grouping.enabled && groups.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Smart Groups ({groups.length})
            </Typography>
            <List dense>
              {groups.map(group => (
                <ListItem key={group.id} divider>
                  <ListItemIcon>
                    <Badge badgeContent={group.summary.count} color="primary">
                      <GroupIcon />
                    </Badge>
                  </ListItemIcon>
                  <ListItemText
                    primary={group.summary.title}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {group.summary.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {group.summary.latest.toLocaleTimeString()} • {group.grouping.algorithm} grouping
                        </Typography>
                      </Box>
                    }
                  />
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleGroupAction('acknowledge', group)}
                    >
                      Ack All
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleGroupAction('dismiss', group)}
                    >
                      Dismiss All
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => {
                        // Handle view group details
                        console.log('View group details:', group);
                      }}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Individual Notifications */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Individual Notifications ({filteredNotifications.length})
          </Typography>
          <List dense>
            {filteredNotifications.slice(0, 20).map(notification => (
              <ListItem key={notification.id} divider>
                <ListItemIcon>
                  {getNotificationIcon(notification.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {notification.title}
                      </Typography>
                      <Chip
                        label={notification.priority}
                        size="small"
                        color={getNotificationColor(notification.priority)}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {notification.timestamp.toLocaleTimeString()} • {notification.source}
                      </Typography>
                      {notification.grouping.isGrouped && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Part of {notification.grouping.groupSize} similar notifications
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <Box display="flex" gap={1}>
                  {!notification.delivery.readAt && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleNotificationAction('acknowledge', notification)}
                    >
                      Ack
                    </Button>
                  )}
                  {!notification.delivery.dismissedAt && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleNotificationAction('dismiss', notification)}
                    >
                      Dismiss
                    </Button>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedNotification(notification);
                      setShowDetailsDialog(true);
                    }}
                  >
                    <ViewIcon />
                  </IconButton>
                </Box>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Notification Details Dialog */}
      <Dialog
        open={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedNotification && (
          <>
            <DialogTitle>
              Notification Details
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    Basic Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Title: {selectedNotification.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Message: {selectedNotification.message}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Source: {selectedNotification.source}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Category: {selectedNotification.category}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    Smart Features
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Relevance: {(selectedNotification.smartFeatures.predictedRelevance * 100).toFixed(0)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Engagement: {(selectedNotification.smartFeatures.userEngagement * 100).toFixed(0)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Urgency: {selectedNotification.smartFeatures.urgency.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sentiment: {selectedNotification.smartFeatures.sentiment}
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowDetailsDialog(false)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Configuration Dialog */}
      <Dialog
        open={showConfigDialog}
        onClose={() => setShowConfigDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Notification Configuration
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Smart Grouping
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.grouping.enabled}
                    onChange={toggleGrouping}
                  />
                }
                label="Enable Smart Grouping"
              />
              {config.grouping.enabled && (
                <>
                  <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                    <InputLabel>Grouping Algorithm</InputLabel>
                    <Select
                      value={config.grouping.algorithm}
                      onChange={(e) => updateGroupingAlgorithm(e.target.value)}
                    >
                      <MenuItem value="similarity">Similarity-based</MenuItem>
                      <MenuItem value="time-window">Time Window</MenuItem>
                      <MenuItem value="severity">Severity-based</MenuItem>
                      <MenuItem value="source">Source-based</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Maximum group size: {config.grouping.maxGroupSize}
                  </Typography>
                </>
              )}
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Smart Delivery
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.smartDelivery.enabled}
                    onChange={(e) => updateSmartDelivery(e.target.checked)}
                  />
                }
                label="Enable Smart Delivery"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Delivery Channels
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(config.channels).map(([channel, enabled]) => (
                  <Grid item xs={12} sm={6} key={channel}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={enabled}
                          onChange={() => setConfig(prev => ({
                            ...prev,
                            channels: {
                              ...prev.channels,
                              [channel]: !prev.channels[channel as keyof typeof prev.channels],
                            },
                          }))}
                        />
                      }
                      label={channel.charAt(0).toUpperCase() + channel.slice(1)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfigDialog(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              // Apply configuration changes
              setSnackbarMessage('Configuration updated successfully');
              setSnackbarOpen(true);
              setShowConfigDialog(false);
            }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </AnimatedBox>
  );
};

export default SmartNotificationSystem;