/**
 * @wip ROADMAP ITEM — NOT ACTIVE
 *
 * This component is part of the AI Dashboard & Intelligence Features planned for future implementation.
 * It has been removed from the active UI navigation and routing.
 *
 * See docs/reference/IMPROVEMENT_ROADMAP.md — "🤖 AI Dashboard & Intelligence Features (Future Roadmap)"
 * for implementation prerequisites and planned scope.
 *
 * DO NOT import or route to this component until the backend AI APIs are implemented.
 */
import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import { AnimatedBox } from '../animations/AnimationComponents';
import { apiService } from '../services/api';
import {
  ExclamationTriangleIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

/**
 * Backend anomaly response type - matches the Anomaly interface from DatabaseManager.
 * This provides type safety for the API response.
 */
interface BackendAnomaly {
  id: string;
  timestamp: string;
  metric: string;
  value: number;
  expectedMean: number;
  standardDeviation: number;
  zScore: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  resolved: boolean;
  tenantId?: string;
}

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
      voting: 1, // 1 for soft voting (simplified)
      weights: 0, // Simplified
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
    events: generateMockAnomalies(),
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

  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize metrics
  useEffect(() => {
    fetchAnomalies();
  }, []);

  useEffect(() => {
    updateMetrics();
  }, [state.events]);

  const fetchAnomalies = async () => {
    try {
      setIsLoading(true);
      // Fetch active anomalies with proper typing
      const data = await apiService.get<BackendAnomaly[]>('/api/anomalies');

      if (data && data.length > 0) {
        // Map backend data to frontend AnomalyEvent
        const mappedEvents: AnomalyEvent[] = data.map(item => ({
          id: item.id,
          timestamp: new Date(item.timestamp),
          metric: item.metric,
          value: item.value,
          expected: item.expectedMean,
          deviation: item.zScore,
          severity: item.severity,
          type: 'point',
          algorithm: 'Statistical',
          confidence: 1,
          explanation: item.explanation,
          context: {
            timeWindow: {
              start: new Date(new Date(item.timestamp).getTime() - 3600000),
              end: new Date(new Date(item.timestamp).getTime() + 3600000)
            },
            relatedMetrics: [],
            baselineStats: {
              mean: item.expectedMean,
              stdDev: item.standardDeviation,
              min: 0,
              max: 0
            }
          },
          status: item.resolved ? 'resolved' : 'new',
          tags: [],
          metadata: { zScore: item.zScore }
        }));

        setState(prev => ({
          ...prev,
          events: mappedEvents,
        }));
      } else {
        // Keep mock data if no real data
        console.log('No real anomalies found, using mock data');
      }
    } catch (error: unknown) {
      // Handle authentication errors (401) - user should be redirected to login
      if (error instanceof Error && error.message.includes('401')) {
        console.warn('Authentication expired, please log in again');
        // The apiService typically handles redirects, but we can add additional handling here
      } else {
        console.error('Failed to fetch anomalies', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
      averageConfidence: state.events.reduce((sum, e) => sum + e.confidence, 0) / state.events.length,
      responseTime: 150,
    };

    setState(prev => ({ ...prev, metrics }));
  };

  const runAnomalyDetection = async () => {
    setIsLoading(true);
    setState(prev => ({ ...prev, isDetecting: true }));

    // For now we just refresh data
    await fetchAnomalies();

    setTimeout(() => {
      setIsLoading(false);
      setState(prev => ({
        ...prev,
        isDetecting: false,
        lastDetection: new Date()
      }));
    }, 1000);
  };

  const toggleAlgorithm = (algorithmId: string) => {
    setState(prev => ({
      ...prev,
      algorithms: prev.algorithms.map(algorithm =>
        algorithm.id === algorithmId
          ? { ...algorithm, isActive: !algorithm.isActive }
          : algorithm,
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

  const updateSensitivity = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig(prev => ({
      ...prev,
      sensitivity: parseFloat(e.target.value),
    }));
  };

  if (!currentUser) {
    return (
      <AnimatedBox
        animation="fade-in"
        className="p-6 flex justify-center items-center min-h-[400px]"
      >
        <div className="card bg-base-100 shadow-xl max-w-md text-center">
          <div className="card-body">
            <ExclamationTriangleIcon className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="card-title justify-center mb-2">
              Anomaly Detection
            </h2>
            <p className="text-base-content/70">
              Please log in to access anomaly detection features.
            </p>
          </div>
        </div>
      </AnimatedBox>
    );
  }

  return (
    <AnimatedBox
      animation="slide-up"
      className="w-full space-y-6"
    >
      {/* WIP Banner */}
      <div className="alert alert-warning shadow-lg">
        <ExclamationTriangleIcon className="w-6 h-6" />
        <div>
          <h3 className="font-bold">Work In Progress</h3>
          <div className="text-xs">
            This page is currently under active development. Real-time anomaly detection integration is partial.
          </div>
        </div>
      </div>

      {/* Anomaly Detection Header */}
      <div className="card bg-base-100 shadow-lg border-l-4 border-primary">
        <div className="card-body p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <ChartBarIcon className="w-10 h-10 text-primary" />
              <div>
                <h2 className="card-title text-2xl">
                  Anomaly Detection
                </h2>
                <p className="text-base-content/70">
                  {state.events.length} anomalies detected • {state.activeAlgorithms.length}/{state.algorithms.length} algorithms active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={`badge ${state.metrics.falsePositiveRate < 0.1 ? 'badge-success' : 'badge-warning'}`}>
                {state.metrics.falsePositiveRate < 0.1 ? 'Low FP' : 'High FP'}
              </div>
              <button
                className="btn btn-circle btn-ghost btn-sm"
                onClick={runAnomalyDetection}
                disabled={isLoading}
              >
                <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                className="btn btn-circle btn-ghost btn-sm"
                onClick={() => setShowConfigDialog(!showConfigDialog)}
              >
                <Cog6ToothIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-base-100 shadow">
          <div className="card-body p-6 text-center">
            <h3 className="text-3xl font-bold text-error">
              {state.metrics.totalEvents}
            </h3>
            <p className="text-sm text-base-content/70">Total Anomalies</p>
            <ExclamationTriangleIcon className="w-6 h-6 text-error mx-auto mt-2" />
          </div>
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body p-6 text-center">
            <h3 className="text-3xl font-bold text-warning">
              {(state.metrics.bySeverity.high || 0) + (state.metrics.bySeverity.critical || 0)}
            </h3>
            <p className="text-sm text-base-content/70">High Priority</p>
            <ExclamationCircleIcon className="w-6 h-6 text-warning mx-auto mt-2" />
          </div>
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body p-6 text-center">
            <h3 className="text-3xl font-bold text-info">
              {(state.metrics.averageConfidence * 100).toFixed(0)}%
            </h3>
            <p className="text-sm text-base-content/70">Avg Confidence</p>
            <ChartBarIcon className="w-6 h-6 text-info mx-auto mt-2" />
          </div>
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body p-6 text-center">
            <h3 className="text-3xl font-bold text-success">
              {(state.metrics.detectionRate * 100).toFixed(0)}%
            </h3>
            <p className="text-sm text-base-content/70">Detection Rate</p>
            <CheckCircleIcon className="w-6 h-6 text-success mx-auto mt-2" />
          </div>
        </div>
      </div>

      {/* Active Algorithms */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">
            Active Algorithms ({state.activeAlgorithms.length}/{state.algorithms.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {state.algorithms.map(algorithm => (
              <div key={algorithm.id} className="card bg-base-200 border border-base-300">
                <div className="card-body p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm">{algorithm.name}</h4>
                    <div className={`badge badge-sm ${algorithm.isActive ? 'badge-success' : 'badge-ghost'}`}>
                      {algorithm.type}
                    </div>
                  </div>
                  <p className="text-xs text-base-content/70 mb-3 line-clamp-2">
                    {algorithm.description}
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-xs mb-3">
                    <span className="text-base-content/60">Acc: {(algorithm.accuracy * 100).toFixed(0)}%</span>
                    <span className="text-base-content/60">F1: {(algorithm.f1Score * 100).toFixed(0)}%</span>
                    <span className="text-base-content/60">Spd: {algorithm.predictionTime}ms</span>
                    <span className="text-base-content/60">Mem: {algorithm.memoryUsage}MB</span>
                  </div>
                  <div className="flex justify-between items-center mt-auto">
                    <div
                      className={`badge badge-sm cursor-pointer ${algorithm.isActive ? 'badge-success' : 'badge-ghost'}`}
                      onClick={() => toggleAlgorithm(algorithm.id)}
                    >
                      {algorithm.isActive ? 'Active' : 'Inactive'}
                    </div>
                    <button className="btn btn-ghost btn-xs btn-square">
                      <Cog6ToothIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sensitivity Control */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Detection Sensitivity</h3>
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm">Sensitivity Level</span>
              <span className="text-sm font-bold">{config.sensitivity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={config.sensitivity}
              onChange={updateSensitivity}
              className="range range-primary range-sm"
            />
            <div className="w-full flex justify-between text-xs px-2 mt-2">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={config.anomalyDetection}
                onChange={() => toggleFeature('anomalyDetection')}
              />
              <span className="label-text">Anomaly Detection</span>
            </label>
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={config.learning.enabled}
                onChange={() => toggleFeature('learning')}
              />
              <span className="label-text">ML Learning</span>
            </label>
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={config.autoResponse.enabled}
                onChange={() => toggleFeature('autoResponse')}
              />
              <span className="label-text">Auto Response</span>
            </label>
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={config.notifications.enabled}
                onChange={() => toggleFeature('notifications')}
              />
              <span className="label-text">Notifications</span>
            </label>
          </div>
        </div>
      </div>
    </AnimatedBox>
  );
};

export default AnomalyDetection;