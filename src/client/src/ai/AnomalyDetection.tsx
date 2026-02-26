import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Paper,
  Slider,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  CheckCircle as CheckIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Visibility as ViewIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import io, { Socket } from 'socket.io-client';
import { AnimatedBox } from '../animations/AnimationComponents';

export interface AnomalyConfig {
  enabled: boolean;
  algorithms: AnomalyAlgorithm[];
  sensitivity: number;
  windowSize: number;
  minSamples: number;
  features: string[];
  thresholds: {
    zScore: number;
    isolationForest: number;
    localOutlierFactor: number;
    oneClassSVM: number;
  };
  notifications: {
    enabled: boolean;
    email: boolean;
    slack: boolean;
    webhook: boolean;
    severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  };
  autoResponse: {
    enabled: boolean;
    actions: AutoResponseAction[];
  };
  learning: {
    enabled: boolean;
    feedbackLoop: boolean;
    adaptationRate: number;
    historicalDataWeight: number;
  };
}

export interface AnomalyAlgorithm {
  id: string;
  name: string;
  type: 'statistical' | 'machine-learning' | 'deep-learning' | 'ensemble';
  description: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingTime: number;
  predictionTime: number;
  memoryUsage: number;
  hyperparameters: Record<string, number>;
  features: string[];
  isActive: boolean;
}

export interface AnomalyEvent {
  id: string;
  timestamp: Date;
  metric: string;
  value: number;
  expected: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'point' | 'contextual' | 'collective' | 'seasonal';
  algorithm: string;
  confidence: number;
  explanation: string;
  context: {
    timeWindow: { start: Date; end: Date };
    relatedMetrics: string[];
    baselineStats: {
      mean: number;
      stdDev: number;
      min: number;
      max: number;
    };
  };
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'false-positive';
  assignedTo?: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface AutoResponseAction {
  id: string;
  name: string;
  trigger: {
    severity: AnomalyEvent['severity'][];
    types: AnomalyEvent['type'][];
    confidence: number;
  };
  action: {
    type: 'alert' | 'log' | 'quarantine' | 'block' | 'notify' | 'escalate';
    parameters: Record<string, unknown>;
    cooldown: number;
  };
  enabled: boolean;
  successRate: number;
}

export interface AnomalyMetrics {
  totalEvents: number;
  bySeverity: Record<AnomalyEvent['severity'], number>;
  byType: Record<AnomalyEvent['type'], number>;
  byAlgorithm: Record<string, number>;
  falsePositiveRate: number;
  detectionRate: number;
  averageConfidence: number;
  responseTime: number;
}

export interface AnomalyState {
  events: AnomalyEvent[];
  algorithms: AnomalyAlgorithm[];
  activeAlgorithms: string[];
  metrics: AnomalyMetrics;
  isTraining: boolean;
  isDetecting: boolean;
  lastTraining: Date;
  lastDetection: Date;
  alerts: AnomalyAlert[];
}

export interface AnomalyAlert {
  id: string;
  eventId: string;
  severity: AnomalyEvent['severity'];
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// Mock machine learning algorithms for demonstration
const mockAlgorithms: AnomalyAlgorithm[] = [
  {
    id: 'isolation-forest-001',
    name: 'Isolation Forest',
    type: 'machine-learning',
    description: 'Isolation-based anomaly detection for high-dimensional data',
    accuracy: 0.89,
    precision: 0.87,
    recall: 0.91,
    f1Score: 0.89,
    trainingTime: 120,
    predictionTime: 15,
    memoryUsage: 256,
    hyperparameters: {
      n_estimators: 100,
      max_samples: 256,
      contamination: 0.1,
      random_state: 42,
    },
    features: ['cpu_usage', 'memory_usage', 'response_time', 'error_rate'],
    isActive: true,
  },
  {
    id: 'zscore-001',
    name: 'Z-Score Statistical',
    type: 'statistical',
    description: 'Statistical anomaly detection using standard deviations',
    accuracy: 0.82,
    precision: 0.85,
    recall: 0.78,
    f1Score: 0.81,
    trainingTime: 10,
    predictionTime: 5,
    memoryUsage: 64,
    hyperparameters: {
      threshold: 2.5,
      window_size: 24,
      min_samples: 30,
    },
    features: ['response_time', 'cpu_usage'],
    isActive: true,
  },
  {
    id: 'lstm-autoencoder-001',
    name: 'LSTM Autoencoder',
    type: 'deep-learning',
    description: 'Deep learning anomaly detection using LSTM autoencoders',
    accuracy: 0.94,
    precision: 0.92,
    recall: 0.96,
    f1Score: 0.94,
    trainingTime: 1800,
    predictionTime: 45,
    memoryUsage: 1024,
    hyperparameters: {
      lstm_units: 128,
      dropout: 0.2,
      learning_rate: 0.001,
      epochs: 100,
      batch_size: 32,
    },
    features: ['multi_variate_time_series'],
    isActive: false,
  },
  {
    id: 'ensemble-voting-001',
    name: 'Ensemble Voting',
    type: 'ensemble',
    description: 'Combines multiple algorithms for improved accuracy',
    accuracy: 0.91,
    precision: 0.90,
    recall: 0.92,
    f1Score: 0.91,
    trainingTime: 300,
    predictionTime: 25,
    memoryUsage: 512,
    hyperparameters: {
      voting: 'soft',
      weights: [0.4, 0.3, 0.3],
      threshold: 0.5,
    },
    features: ['ensemble_features'],
    isActive: true,
  },
];

// Mock anomaly events for demonstration
const generateMockAnomalies = (): AnomalyEvent[] => {
  const anomalies: AnomalyEvent[] = [];
  const now = new Date();
  
  for (let i = 0; i < 20; i++) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const isAnomaly = Math.random() > 0.7;
    
    if (isAnomaly) {
      const baseValue = 100 + Math.sin(i / 24) * 20;
      const anomalyValue = baseValue + (Math.random() - 0.5) * 100;
      const deviation = Math.abs(anomalyValue - baseValue) / baseValue;
      
      const severity: AnomalyEvent['severity'] = deviation > 0.5 ? 'critical' : 
                                               deviation > 0.3 ? 'high' : 
                                               deviation > 0.15 ? 'medium' : 'low';
      
      const type: AnomalyEvent['type'] = Math.random() > 0.7 ? 'point' : 
                                        Math.random() > 0.5 ? 'contextual' : 'seasonal';
      
      anomalies.push({
        id: `anomaly-${Date.now()}-${i}`,
        timestamp,
        metric: ['CPU Usage', 'Memory Usage', 'Response Time', 'Error Rate'][Math.floor(Math.random() * 4)],
        value: Math.max(0, anomalyValue),
        expected: baseValue,
        deviation,
        severity,
        type,
        algorithm: mockAlgorithms[Math.floor(Math.random() * mockAlgorithms.length)].name,
        confidence: 0.7 + Math.random() * 0.3,
        explanation: `Value deviated ${(deviation * 100).toFixed(1)}% from expected baseline`,
        context: {
          timeWindow: { start: new Date(timestamp.getTime() - 3600000), end: new Date(timestamp.getTime() + 3600000) },
          relatedMetrics: ['CPU Usage', 'Memory Usage'],
          baselineStats: {
            mean: baseValue,
            stdDev: 15,
            min: baseValue - 30,
            max: baseValue + 30,
          },
        },
        status: ['new', 'acknowledged', 'investigating'][Math.floor(Math.random() * 3)] as AnomalyEvent['status'],
        tags: ['performance', 'critical', 'automated'],
        metadata: { severity_score: deviation * 100 },
      });
    }
  }
  
  return anomalies;
};

const mockAutoResponseActions: AutoResponseAction[] = [
  {
    id: 'action-001',
    name: 'High CPU Alert',
    trigger: {
      severity: ['critical', 'high'],
      types: ['point', 'contextual'],
      confidence: 0.8,
    },
    action: {
      type: 'alert',
      parameters: { channels: ['email', 'slack'], priority: 'high' },
      cooldown: 300,
    },
    enabled: true,
    successRate: 0.95,
  },
  {
    id: 'action-002',
    name: 'Quarantine Suspicious Bot',
    trigger: {
      severity: ['critical'],
      types: ['point'],
      confidence: 0.9,
    },
    action: {
      type: 'quarantine',
      parameters: { duration: 3600, reason: 'anomaly_detection' },
      cooldown: 3600,
    },
    enabled: false,
    successRate: 0.88,
  },
  {
    id: 'action-003',
    name: 'Log Anomaly Event',
    trigger: {
      severity: ['low', 'medium', 'high', 'critical'],
      types: ['point', 'contextual', 'seasonal'],
      confidence: 0.6,
    },
    action: {
      type: 'log',
      parameters: { level: 'warning', category: 'anomaly' },
      cooldown: 0,
    },
    enabled: true,
    successRate: 0.99,
  },
];

interface AnomalyDetectionProps {
  onAnomalyDetected?: (anomaly: AnomalyEvent) => void;
}

export const AnomalyDetection: React.FC<AnomalyDetectionProps> = ({ onAnomalyDetected }) => {
  const currentUser = useAppSelector(selectUser);
  const [config, setConfig] = useState<AnomalyConfig>({
    enabled: true,
    algorithms: mockAlgorithms,
    sensitivity: 0.8,
    windowSize: 24,
    minSamples: 30,
    features: ['cpu_usage', 'memory_usage', 'response_time', 'error_rate'],
    thresholds: {
      zScore: 2.5,
      isolationForest: 0.1,
      localOutlierFactor: 1.5,
      oneClassSVM: 0.5,
    },
    notifications: {
      enabled: true,
      email: true,
      slack: false,
      webhook: false,
      severityThreshold: 'medium',
    },
    autoResponse: {
      enabled: true,
      actions: mockAutoResponseActions,
    },
    learning: {
      enabled: true,
      feedbackLoop: true,
      adaptationRate: 0.1,
      historicalDataWeight: 0.7,
    },
  });
  
  const [state, setState] = useState<AnomalyState>({
    events: [],
    algorithms: mockAlgorithms,
    activeAlgorithms: mockAlgorithms.filter(a => a.isActive).map(a => a.id),
    metrics: {
      totalEvents: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byType: { point: 0, contextual: 0, collective: 0, seasonal: 0 },
      byAlgorithm: {},
      falsePositiveRate: 0.05,
      detectionRate: 0.85,
      averageConfidence: 0.82,
      responseTime: 150,
    },
    isTraining: false,
    isDetecting: false,
    lastTraining: new Date(Date.now() - 24 * 60 * 60 * 1000),
    lastDetection: new Date(),
    alerts: [],
  });
  
  const [selectedEvent, setSelectedEvent] = useState<AnomalyEvent | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // WebSocket connection
  useEffect(() => {
    const socketIo = io(process.env.REACT_APP_API_URL || 'http://localhost:3000', {
      path: '/webui/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketIo.on('connect', () => {
      console.log('Connected to WebSocket for anomaly detection');
    });

    socketIo.on('alert_update', (alert) => {
      // Add anomaly alert to state
      setState(prev => ({
        ...prev,
        alerts: [...prev.alerts, alert],
      }));

      if (onAnomalyDetected) {
        onAnomalyDetected(alert as any);
      }
    });

    socketIo.on('anomalyDetected', (anomaly) => {
      setState(prev => ({
        ...prev,
        events: [...prev.events, anomaly],
      }));

      updateMetrics();
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, [onAnomalyDetected]);

  // Fetch initial anomalies
  useEffect(() => {
    const fetchAnomalies = async () => {
      try {
        const response = await fetch('/api/health/anomalies');
        if (response.ok) {
          const data = await response.json();
          setState(prev => ({
            ...prev,
            events: data.anomalies || [],
          }));
          updateMetrics();
        }
      } catch (error) {
        console.error('Failed to fetch anomalies:', error);
      }
    };

    fetchAnomalies();

    // Refresh every 30 seconds
    const interval = setInterval(fetchAnomalies, 30000);
    return () => clearInterval(interval);
  }, []);

  const updateMetrics = () => {
    const metrics: AnomalyMetrics = {
      totalEvents: state.events.length,
      bySeverity: state.events.reduce((acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      }, {} as Record<AnomalyEvent['severity'], number>),
      byType: state.events.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {} as Record<AnomalyEvent['type'], number>),
      byAlgorithm: state.events.reduce((acc, event) => {
        acc[event.algorithm] = (acc[event.algorithm] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      falsePositiveRate: 0.05,
      detectionRate: 0.85,
      averageConfidence: state.events.reduce((sum, e) => sum + e.confidence, 0) / state.events.length || 0,
      responseTime: 150,
    };
    
    setState(prev => ({ ...prev, metrics }));
  };

  const runAnomalyDetection = async () => {
    setIsLoading(true);
    setState(prev => ({ ...prev, isDetecting: true }));
    
    try {
      const response = await fetch('/api/health/anomalies');
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          events: data.anomalies || [],
          isDetecting: false,
          lastDetection: new Date(),
        }));
        updateMetrics();
      }
    } catch (error) {
      console.error('Failed to run anomaly detection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const acknowledgeAnomaly = (eventId: string) => {
    setState(prev => ({
      ...prev,
      events: prev.events.map(event =>
        event.id === eventId
          ? { ...event, status: 'acknowledged', assignedTo: currentUser?.username }
          : event
      ),
    }));
  };

  const markAsFalsePositive = (eventId: string) => {
    setState(prev => ({
      ...prev,
      events: prev.events.map(event =>
        event.id === eventId
          ? { ...event, status: 'false-positive' }
          : event
      ),
    }));
  };

  const toggleAlgorithm = (algorithmId: string) => {
    setState(prev => ({
      ...prev,
      algorithms: prev.algorithms.map(algorithm =>
        algorithm.id === algorithmId
          ? { ...algorithm, isActive: !algorithm.isActive }
          : algorithm
      ),
      activeAlgorithms: prev.activeAlgorithms.includes(algorithmId)
        ? prev.activeAlgorithms.filter(id => id !== algorithmId)
        : [...prev.activeAlgorithms, algorithmId],
    }));
  };

  const toggleFeature = (feature: keyof AnomalyConfig) => {
    setConfig(prev => ({
      ...prev,
      [feature]: !prev[feature],
    }));
  };

  const updateSensitivity = (event: Event, newValue: number | number[]) => {
    setConfig(prev => ({
      ...prev,
      sensitivity: Array.isArray(newValue) ? newValue[0] : newValue,
    }));
  };

  if (!currentUser) {
    return (
      <AnimatedBox
        animation={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
        sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}
      >
        <Card sx={{ maxWidth: 400, textAlign: 'center' }}>
          <CardContent>
            <WarningIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Anomaly Detection
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please log in to access anomaly detection features.
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
      {/* Anomaly Detection Header */}
      <Card sx={{ mb: 3, borderLeft: 4, borderColor: 'primary.main' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <AssessmentIcon color="primary" fontSize="large" />
              <Box>
                <Typography variant="h6">
                  Anomaly Detection
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {state.events.length} anomalies detected • {state.activeAlgorithms.length}/{state.algorithms.length} algorithms active
                </Typography>
              </Box>
            </Box>
            
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={state.metrics.falsePositiveRate < 0.1 ? 'Low FP' : 'High FP'}
                size="small"
                color={state.metrics.falsePositiveRate < 0.1 ? 'success' : 'warning'}
              />
              <IconButton onClick={runAnomalyDetection} disabled={isLoading}>
                <RefreshIcon />
              </IconButton>
              <IconButton onClick={() => setShowConfigDialog(true)}>
                <SettingsIcon />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Metrics Overview */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box textAlign="center">
                <Typography variant="h4" color="error.main">
                  {state.metrics.totalEvents}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Anomalies
                </Typography>
                <WarningIcon color="error" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box textAlign="center">
                <Typography variant="h4" color="warning.main">
                  {state.metrics.bySeverity.high + state.metrics.bySeverity.critical}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  High Priority
                </Typography>
                <WarningIcon color="warning" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box textAlign="center">
                <Typography variant="h4" color="info.main">
                  {(state.metrics.averageConfidence * 100).toFixed(0)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Confidence
                </Typography>
                <AssessmentIcon color="info" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box textAlign="center">
                <Typography variant="h4" color="success.main">
                  {state.metrics.detectionRate * 100}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Detection Rate
                </Typography>
                <CheckIcon color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Algorithms */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Active Algorithms ({state.activeAlgorithms.length}/{state.algorithms.length})
          </Typography>
          <Grid container spacing={2}>
            {state.algorithms.map(algorithm => (
              <Grid item xs={12} sm={6} md={3} key={algorithm.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {algorithm.name}
                      </Typography>
                      <Chip
                        label={algorithm.type}
                        size="small"
                        color={algorithm.isActive ? 'success' : 'default'}
                        variant={algorithm.isActive ? 'filled' : 'outlined'}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      {algorithm.description}
                    </Typography>
                    <Box mb={2}>
                      <Typography variant="body2" fontWeight="medium" gutterBottom>
                        Performance:
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Accuracy: {(algorithm.accuracy * 100).toFixed(0)}%
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            F1-Score: {(algorithm.f1Score * 100).toFixed(0)}%
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Speed: {algorithm.predictionTime}ms
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Memory: {algorithm.memoryUsage}MB
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Chip
                        label={algorithm.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={algorithm.isActive ? 'success' : 'default'}
                        onClick={() => toggleAlgorithm(algorithm.id)}
                      />
                      <IconButton size="small">
                        <SettingsIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Sensitivity Control */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Detection Sensitivity
          </Typography>
          <Box mb={2}>
            <Typography variant="body2" gutterBottom>
              Sensitivity Level: {config.sensitivity.toFixed(2)}
            </Typography>
            <Slider
              value={config.sensitivity}
              onChange={updateSensitivity}
              min={0.1}
              max={1.0}
              step={0.1}
              marks={[
                { value: 0.1, label: 'Low' },
                { value: 0.5, label: 'Medium' },
                { value: 1.0, label: 'High' },
              ]}
              valueLabelDisplay="auto"
            />
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.anomalyDetection}
                    onChange={() => toggleFeature('anomalyDetection')}
                  />
                }
                label="Anomaly Detection"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.learning.enabled}
                    onChange={() => toggleFeature('learning')}
                  />
                }
                label="ML Learning"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.autoResponse.enabled}
                    onChange={() => toggleFeature('autoResponse')}
                  />
                }
                label="Auto Response"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.notifications.enabled}
                    onChange={() => toggleFeature('notifications')}
                  />
                }
                label="Notifications"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Recent Anomalies */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Anomalies ({state.events.length})
          </Typography>
          {state.events.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No anomalies detected in the current time window.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Metric</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell align="right">Expected</TableCell>
                    <TableCell align="center">Severity</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Algorithm</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.events.slice(0, 10).map(event => (
                    <TableRow key={event.id} hover>
                      <TableCell>{event.timestamp.toLocaleString()}</TableCell>
                      <TableCell>{event.metric}</TableCell>
                      <TableCell align="right">{event.value.toFixed(2)}</TableCell>
                      <TableCell align="right">{event.expected.toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={event.severity}
                          size="small"
                          color={event.severity === 'critical' ? 'error' : 
                                 event.severity === 'high' ? 'warning' : 
                                 event.severity === 'medium' ? 'info' : 'success'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={event.type}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={event.algorithm}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={event.status}
                          size="small"
                          color={event.status === 'new' ? 'primary' : 
                                 event.status === 'acknowledged' ? 'warning' : 
                                 event.status === 'false-positive' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" gap={1}>
                          {event.status === 'new' && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => acknowledgeAnomaly(event.id)}
                            >
                              Ack
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => markAsFalsePositive(event.id)}
                          >
                              FP
                          </Button>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Anomaly Details Dialog */}
      <Dialog
        open={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedEvent && (
          <>
            <DialogTitle>
              Anomaly Details - {selectedEvent.metric}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    Basic Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Timestamp: {selectedEvent.timestamp.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Value: {selectedEvent.value.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Expected: {selectedEvent.expected.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Deviation: {(selectedEvent.deviation * 100).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    Detection Details
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Algorithm: {selectedEvent.algorithm}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Confidence: {(selectedEvent.confidence * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Type: {selectedEvent.type}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Severity: {selectedEvent.severity}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    Explanation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedEvent.explanation}
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
    </AnimatedBox>
  );
};

export default AnomalyDetection;