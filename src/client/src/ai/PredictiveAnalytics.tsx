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
import {
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metadata?: {
    botId?: string;
    metric?: string;
    category?: string;
    confidence?: number;
  };
}

export interface ForecastResult {
  timestamp: Date;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  seasonality: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  anomaly: boolean;
}

export interface PredictionModel {
  id: string;
  name: string;
  type: 'arima' | 'prophet' | 'lstm' | 'gru' | 'linear-regression' | 'exponential-smoothing';
  description: string;
  accuracy: number;
  confidence: number;
  trainingData: number;
  lastTrained: Date;
  hyperparameters: Record<string, number>;
  features: string[];
  target: string;
}

export interface AnomalyDetection {
  timestamp: Date;
  value: number;
  expected: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'spike' | 'drop' | 'trend-change' | 'seasonal-anomaly';
  confidence: number;
  explanation: string;
  recommendedAction?: string;
}

export interface PredictiveMetrics {
  modelAccuracy: number;
  predictionConfidence: number;
  anomalyDetectionRate: number;
  falsePositiveRate: number;
  forecastHorizon: number;
  computationalCost: number;
  memoryUsage: number;
  [key: string]: number;
}

export interface PredictiveConfig {
  enabled: boolean;
  models: PredictionModel[];
  forecastHorizon: number; // days
  confidenceThreshold: number;
  anomalyDetection: boolean;
  autoRetrain: boolean;
  retrainInterval: number; // hours
  maxTrainingData: number;
  featureEngineering: boolean;
  seasonalityDetection: boolean;
  trendAnalysis: boolean;
}

export interface PredictiveState {
  historicalData: TimeSeriesData[];
  forecast: ForecastResult[];
  anomalies: AnomalyDetection[];
  models: PredictionModel[];
  selectedModel: string | null;
  metrics: PredictiveMetrics;
  isTraining: boolean;
  isPredicting: boolean;
  lastUpdate: Date;
}

const defaultConfig: PredictiveConfig = {
  enabled: true,
  models: [
    {
      id: 'prophet-001',
      name: 'Prophet Model',
      type: 'prophet',
      description: 'Facebook Prophet for time series forecasting with seasonality',
      accuracy: 0.87,
      confidence: 0.92,
      trainingData: 1000,
      lastTrained: new Date(Date.now() - 24 * 60 * 60 * 1000),
      hyperparameters: {
        changepoint_prior_scale: 0.05,
        seasonality_prior_scale: 10,
        holidays_prior_scale: 10,
        seasonality_mode: 1, // 1 for multiplicative (simplified for type safety)
      },
      features: ['timestamp', 'value', 'trend', 'seasonality'],
      target: 'bot_performance',
    },
    {
      id: 'lstm-001',
      name: 'LSTM Neural Network',
      type: 'lstm',
      description: 'Long Short-Term Memory for complex temporal patterns',
      accuracy: 0.91,
      confidence: 0.89,
      trainingData: 2000,
      lastTrained: new Date(Date.now() - 48 * 60 * 60 * 1000),
      hyperparameters: {
        lstm_units: 128,
        dropout: 0.2,
        learning_rate: 0.001,
        batch_size: 32,
        epochs: 100,
      },
      features: ['timestamp', 'value', 'lag_features', 'rolling_stats'],
      target: 'bot_performance',
    },
    {
      id: 'arima-001',
      name: 'ARIMA Model',
      type: 'arima',
      description: 'AutoRegressive Integrated Moving Average for linear trends',
      accuracy: 0.83,
      confidence: 0.85,
      trainingData: 800,
      lastTrained: new Date(Date.now() - 12 * 60 * 60 * 1000),
      hyperparameters: {
        p: 2,
        d: 1,
        q: 2,
        seasonal_order: 24,
      },
      features: ['timestamp', 'value', 'differenced_value'],
      target: 'bot_performance',
    },
  ],
  forecastHorizon: 7, // 7 days
  confidenceThreshold: 0.8,
  anomalyDetection: true,
  autoRetrain: true,
  retrainInterval: 24, // 24 hours
  maxTrainingData: 5000,
  featureEngineering: true,
  seasonalityDetection: true,
  trendAnalysis: true,
};

// Mock data generation for demonstration
const generateHistoricalData = (days: number = 30): TimeSeriesData[] => {
  const data: TimeSeriesData[] = [];
  const now = new Date();

  for (let i = 0; i < days * 24; i++) { // Hourly data
    const timestamp = new Date(now.getTime() - (days * 24 - i) * 60 * 60 * 1000);
    const baseValue = 100 + Math.sin(i / 24) * 20; // Daily seasonality
    const trend = i * 0.1; // Upward trend
    const noise = (Math.random() - 0.5) * 10; // Random noise
    const anomaly = Math.random() > 0.95 ? (Math.random() - 0.5) * 50 : 0; // Occasional anomalies

    data.push({
      timestamp,
      value: Math.max(0, baseValue + trend + noise + anomaly),
      metadata: {
        botId: `bot-${Math.floor(Math.random() * 5) + 1}`,
        metric: 'response_time',
        category: 'performance',
        confidence: 0.95,
      },
    });
  }

  return data;
};

const generateForecast = (historicalData: TimeSeriesData[], model: PredictionModel): ForecastResult[] => {
  const forecast: ForecastResult[] = [];
  const lastTimestamp = historicalData[historicalData.length - 1].timestamp;
  const lastValue = historicalData[historicalData.length - 1].value;

  for (let i = 1; i <= 24 * 7; i++) { // 7 days forecast
    const timestamp = new Date(lastTimestamp.getTime() + i * 60 * 60 * 1000);

    // Simple forecast simulation based on model type
    let predicted = lastValue;
    let confidence = model.confidence;

    switch (model.type) {
      case 'prophet':
        predicted = lastValue + Math.sin(i / 24) * 15 + i * 0.05;
        confidence = 0.92;
        break;
      case 'lstm':
        predicted = lastValue * 1.001 + Math.sin(i / 12) * 8;
        confidence = 0.89;
        break;
      case 'arima':
        predicted = lastValue + (Math.random() - 0.5) * 5 + i * 0.02;
        confidence = 0.85;
        break;
    }

    const seasonalComponent = Math.sin(i / 24) * 10; // Daily seasonality
    const trendComponent = i * 0.1; // Linear trend
    const noise = (Math.random() - 0.5) * 5;

    predicted = Math.max(0, predicted + seasonalComponent + trendComponent + noise);

    forecast.push({
      timestamp,
      predicted,
      lowerBound: predicted * (1 - (1 - confidence) * 2),
      upperBound: predicted * (1 + (1 - confidence) * 2),
      confidence,
      seasonality: {
        daily: Math.sin(i / 24) * 10,
        weekly: Math.sin(i / 168) * 5,
        monthly: Math.sin(i / 720) * 3,
      },
      trend: Math.random() > 0.5 ? 'increasing' : 'stable',
      anomaly: Math.random() > 0.98, // 2% chance of anomaly
    });
  }

  return forecast;
};

const detectAnomalies = (historicalData: TimeSeriesData[], forecast: ForecastResult[]): AnomalyDetection[] => {
  const anomalies: AnomalyDetection[] = [];

  historicalData.forEach(data => {
    const correspondingForecast = forecast.find(f =>
      Math.abs(f.timestamp.getTime() - data.timestamp.getTime()) < 60 * 60 * 1000,
    );

    if (correspondingForecast && correspondingForecast.anomaly) {
      const expected = correspondingForecast.predicted;
      const deviation = Math.abs(data.value - expected) / expected;
      const severity = deviation > 0.5 ? 'critical' :
        deviation > 0.3 ? 'high' :
          deviation > 0.15 ? 'medium' : 'low';

      anomalies.push({
        timestamp: data.timestamp,
        value: data.value,
        expected,
        deviation,
        severity,
        type: data.value > expected ? 'spike' : 'drop',
        confidence: correspondingForecast.confidence,
        explanation: `Value deviated ${(deviation * 100).toFixed(1)}% from expected`,
        recommendedAction: severity === 'critical' ? 'Investigate immediately' :
          severity === 'high' ? 'Monitor closely' : 'Keep watching',
      });
    }
  });

  return anomalies.slice(0, 10); // Limit to 10 anomalies
};

const calculateMetrics = (model: PredictionModel, forecast: ForecastResult[], anomalies: AnomalyDetection[]): PredictiveMetrics => {
  const avgConfidence = forecast.reduce((sum, f) => sum + f.confidence, 0) / forecast.length;
  const modelAccuracy = model.accuracy;
  const anomalyRate = anomalies.length / forecast.length;
  const falsePositiveRate = anomalyRate * 0.1; // Estimated

  return {
    modelAccuracy,
    predictionConfidence: avgConfidence,
    anomalyDetectionRate: anomalyRate,
    falsePositiveRate,
    forecastHorizon: forecast.length,
    computationalCost: model.type === 'lstm' ? 100 : model.type === 'prophet' ? 50 : 20,
    memoryUsage: model.type === 'lstm' ? 500 : model.type === 'prophet' ? 200 : 100,
  };
};

export const PredictiveAnalytics: React.FC = () => {
  const currentUser = useAppSelector(selectUser);
  const [config, setConfig] = useState<PredictiveConfig>(defaultConfig);
  const [state, setState] = useState<PredictiveState>({
    historicalData: [],
    forecast: [],
    anomalies: [],
    models: config.models,
    selectedModel: config.models[0].id,
    metrics: {
      modelAccuracy: 0,
      predictionConfidence: 0,
      anomalyDetectionRate: 0,
      falsePositiveRate: 0,
      forecastHorizon: 0,
      computationalCost: 0,
      memoryUsage: 0,
    },
    isTraining: false,
    isPredicting: false,
    lastUpdate: new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [forecastDays, setForecastDays] = useState(7);
  const [showConfidenceBands, setShowConfidenceBands] = useState(true);

  // Initialize data on mount
  useEffect(() => {
    if (config.enabled) {
      generatePredictions();
    }
  }, [config.enabled]);

  const generatePredictions = async () => {
    setIsLoading(true);
    setState(prev => ({ ...prev, isPredicting: true }));

    // Simulate API delay
    setTimeout(() => {
      const historicalData = generateHistoricalData(30);
      const selectedModel = state.models.find(m => m.id === state.selectedModel) || state.models[0];
      const forecast = generateForecast(historicalData, selectedModel);
      const anomalies = detectAnomalies(historicalData, forecast);
      const metrics = calculateMetrics(selectedModel, forecast, anomalies);

      setState(prev => ({
        ...prev,
        historicalData,
        forecast,
        anomalies,
        metrics,
        isPredicting: false,
        lastUpdate: new Date(),
      }));

      setIsLoading(false);
    }, 2000);
  };

  const retrainModel = async (modelId: string) => {
    setState(prev => ({ ...prev, isTraining: true }));

    setTimeout(() => {
      setState(prev => ({
        ...prev,
        models: prev.models.map(model =>
          model.id === modelId
            ? { ...model, lastTrained: new Date(), accuracy: Math.min(0.99, model.accuracy + 0.02) }
            : model,
        ),
        isTraining: false,
      }));
    }, 3000);
  };


  const exportPredictions = () => {
    const data = {
      historical: state.historicalData,
      forecast: state.forecast,
      anomalies: state.anomalies,
      model: state.models.find(m => m.id === state.selectedModel),
      metrics: state.metrics,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `predictions-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleFeature = (feature: keyof PredictiveConfig) => {
    setConfig(prev => ({
      ...prev,
      [feature]: !prev[feature],
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
            <ChartBarIcon className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="card-title justify-center mb-2">
              Predictive Analytics
            </h2>
            <p className="text-base-content/70">
              Please log in to access predictive analytics features.
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
      {/* Predictive Analytics Header */}
      <div className="card bg-base-100 shadow-lg border-l-4 border-primary">
        <div className="card-body p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <ArrowTrendingUpIcon className="w-10 h-10 text-primary" />
              <div>
                <h2 className="card-title text-2xl">
                  Predictive Analytics
                </h2>
                <p className="text-base-content/70">
                  {state.selectedModel} • {state.forecast.length} predictions • {state.anomalies.length} anomalies
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="badge badge-success gap-1">
                {state.models.find(m => m.id === state.selectedModel)?.accuracy ? `${(state.models.find(m => m.id === state.selectedModel)!.accuracy * 100).toFixed(0)}% accuracy` : 'N/A'}
              </div>
              <div className={`badge ${config.enabled ? 'badge-success' : 'badge-ghost'}`}>
                {config.enabled ? 'AI Active' : 'AI Disabled'}
              </div>
              <button
                className="btn btn-circle btn-ghost btn-sm"
                onClick={generatePredictions}
                disabled={isLoading}
              >
                <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Model Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-base-100 shadow">
          <div className="card-body p-6 text-center">
            <h3 className="text-3xl font-bold text-success">
              {(state.metrics.modelAccuracy * 100).toFixed(0)}%
            </h3>
            <p className="text-sm text-base-content/70">Model Accuracy</p>
            <ChartBarIcon className="w-6 h-6 text-success mx-auto mt-2" />
          </div>
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body p-6 text-center">
            <h3 className="text-3xl font-bold text-info">
              {(state.metrics.predictionConfidence * 100).toFixed(0)}%
            </h3>
            <p className="text-sm text-base-content/70">Prediction Confidence</p>
            <SparklesIcon className="w-6 h-6 text-info mx-auto mt-2" />
          </div>
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body p-6 text-center">
            <h3 className="text-3xl font-bold text-warning">
              {(state.metrics.anomalyDetectionRate * 100).toFixed(1)}%
            </h3>
            <p className="text-sm text-base-content/70">Anomaly Rate</p>
            <ExclamationTriangleIcon className="w-6 h-6 text-warning mx-auto mt-2" />
          </div>
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body p-6 text-center">
            <h3 className="text-3xl font-bold text-primary">
              {state.metrics.forecastHorizon}
            </h3>
            <p className="text-sm text-base-content/70">Forecast Horizon</p>
            <ClockIcon className="w-6 h-6 text-primary mx-auto mt-2" />
          </div>
        </div>
      </div>

      {/* Model Selection */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Prediction Models</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="join w-full">
              {state.models.map(model => (
                <input
                  key={model.id}
                  className="join-item btn flex-1"
                  type="radio"
                  name="model-selection"
                  aria-label={`${model.name} (${(model.accuracy * 100).toFixed(0)}%)`}
                  checked={state.selectedModel === model.id}
                  onChange={() => setState(prev => ({ ...prev, selectedModel: model.id }))}
                />
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                className="btn btn-outline gap-2"
                onClick={() => retrainModel(state.selectedModel!)}
                disabled={state.isTraining}
              >
                {state.isTraining ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <ArrowPathIcon className="w-4 h-4" />
                )}
                {state.isTraining ? 'Training...' : 'Retrain Model'}
              </button>
              <button
                className="btn btn-outline gap-2"
                onClick={exportPredictions}
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Configuration */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Forecast Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Forecast Days</span>
                <span className="text-sm font-bold">{forecastDays} days</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={forecastDays}
                onChange={(e) => setForecastDays(parseInt(e.target.value))}
                className="range range-primary range-sm"
                step="1"
              />
              <div className="w-full flex justify-between text-xs px-2 mt-2">
                <span>1d</span>
                <span>7d</span>
                <span>14d</span>
                <span>30d</span>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <label className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={showConfidenceBands}
                  onChange={(e) => setShowConfidenceBands(e.target.checked)}
                />
                <span className="label-text">Show Confidence Bands</span>
              </label>
              <label className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={config.anomalyDetection}
                  onChange={() => toggleFeature('anomalyDetection')}
                />
                <span className="label-text">Anomaly Detection</span>
              </label>
              <label className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={config.featureEngineering}
                  onChange={() => toggleFeature('featureEngineering')}
                />
                <span className="label-text">Feature Engineering</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Anomaly Detection Table */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">
            Detected Anomalies ({state.anomalies.length})
          </h3>
          {state.anomalies.length === 0 ? (
            <div className="alert alert-info">
              <InformationCircleIcon className="w-6 h-6" />
              <span>No anomalies detected in the current forecast period.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th className="text-right">Value</th>
                    <th className="text-right">Expected</th>
                    <th className="text-right">Deviation</th>
                    <th className="text-center">Severity</th>
                    <th>Type</th>
                    <th>Explanation</th>
                  </tr>
                </thead>
                <tbody>
                  {state.anomalies.map((anomaly, index) => (
                    <tr key={index} className="hover">
                      <td>{anomaly.timestamp.toLocaleString()}</td>
                      <td className="text-right">{anomaly.value.toFixed(2)}</td>
                      <td className="text-right">{anomaly.expected.toFixed(2)}</td>
                      <td className="text-right">{(anomaly.deviation * 100).toFixed(1)}%</td>
                      <td className="text-center">
                        <div className={`badge badge-sm ${anomaly.severity === 'critical' ? 'badge-error' :
                          anomaly.severity === 'high' ? 'badge-warning' : 'badge-info'
                          }`}>
                          {anomaly.severity}
                        </div>
                      </td>
                      <td>
                        <div className="badge badge-ghost badge-outline badge-sm">
                          {anomaly.type}
                        </div>
                      </td>
                      <td className="text-sm opacity-70">{anomaly.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Model Details */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Model Details & Performance</h3>
          {state.selectedModel && (() => {
            const model = state.models.find(m => m.id === state.selectedModel)!;
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="mb-6">
                    <h4 className="font-bold mb-1">
                      {model.name} ({model.type.toUpperCase()})
                    </h4>
                    <p className="text-sm text-base-content/70">
                      {model.description}
                    </p>
                  </div>
                  <div className="mb-6">
                    <h4 className="font-bold mb-2">Performance Metrics:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-base-content/70">
                        Accuracy: <span className="text-base-content font-medium">{(model.accuracy * 100).toFixed(1)}%</span>
                      </div>
                      <div className="text-base-content/70">
                        Confidence: <span className="text-base-content font-medium">{(model.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="text-base-content/70">
                        Training Data: <span className="text-base-content font-medium">{model.trainingData} points</span>
                      </div>
                      <div className="text-base-content/70">
                        Last Trained: <span className="text-base-content font-medium">{model.lastTrained.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-6">
                    <h4 className="font-bold mb-2">Hyperparameters:</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(model.hyperparameters).map(([key, value]) => (
                        <div key={key} className="badge badge-ghost badge-outline">
                          {key}: {value}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold mb-2">Features Used:</h4>
                    <div className="flex flex-wrap gap-2">
                      {model.features.map(feature => (
                        <div key={feature} className="badge badge-primary badge-outline">
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </AnimatedBox>
  );
};

function InformationCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

export default PredictiveAnalytics;