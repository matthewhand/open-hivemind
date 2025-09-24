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
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  FormControlLabel,
  Switch
} from '@mui/material';
import { 
  TrendingUp as TrendingIcon,
  Insights as InsightsIcon,
  Assessment as AssessmentIcon,
  Schedule as TimeIcon,
  ShowChart as ChartIcon,
  Warning as WarningIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { AnimatedBox } from '../animations/AnimationComponents';

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
        seasonality_mode: 'multiplicative',
      } as number,
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
      Math.abs(f.timestamp.getTime() - data.timestamp.getTime()) < 60 * 60 * 1000
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
            : model
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
        animation={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
        sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}
      >
        <Card sx={{ maxWidth: 400, textAlign: 'center' }}>
          <CardContent>
            <AssessmentIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Predictive Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please log in to access predictive analytics features.
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
      {/* Predictive Analytics Header */}
      <Card sx={{ mb: 3, borderLeft: 4, borderColor: 'primary.main' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <TrendingIcon color="primary" fontSize="large" />
              <Box>
                <Typography variant="h6">
                  Predictive Analytics
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {state.selectedModel} • {state.forecast.length} predictions • {state.anomalies.length} anomalies
                </Typography>
              </Box>
            </Box>
            
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={state.models.find(m => m.id === state.selectedModel)?.accuracy ? `${(state.models.find(m => m.id === state.selectedModel)!.accuracy * 100).toFixed(0)}% accuracy` : 'N/A'}
                size="small"
                color="success"
              />
              <Chip
                label={config.enabled ? 'AI Active' : 'AI Disabled'}
                size="small"
                color={config.enabled ? 'success' : 'default'}
              />
              <IconButton onClick={generatePredictions} disabled={isLoading}>
                <RefreshIcon />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Model Performance Metrics */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box textAlign="center">
                <Typography variant="h4" color="success.main">
                  {(state.metrics.modelAccuracy * 100).toFixed(0)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Model Accuracy
                </Typography>
                <ChartIcon color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box textAlign="center">
                <Typography variant="h4" color="info.main">
                  {(state.metrics.predictionConfidence * 100).toFixed(0)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Prediction Confidence
                </Typography>
                <InsightsIcon color="info" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box textAlign="center">
                <Typography variant="h4" color="warning.main">
                  {(state.metrics.anomalyDetectionRate * 100).toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Anomaly Rate
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
                <Typography variant="h4" color="primary.main">
                  {state.metrics.forecastHorizon}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Forecast Horizon
                </Typography>
                <TimeIcon color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Model Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Prediction Models
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <ToggleButtonGroup
                value={state.selectedModel}
                exclusive
                onChange={(event, value) => value && setState(prev => ({ ...prev, selectedModel: value }))}
                size="small"
              >
                {state.models.map(model => (
                  <ToggleButton key={model.id} value={model.id}>
                    <Box textAlign="center">
                      <Typography variant="body2">{model.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(model.accuracy * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => retrainModel(state.selectedModel!)}
                  disabled={state.isTraining}
                  startIcon={state.isTraining ? <LinearProgress size={16} /> : <RefreshIcon />}
                >
                  {state.isTraining ? 'Training...' : 'Retrain Model'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={exportPredictions}
                  startIcon={<DownloadIcon />}
                >
                  Export
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Forecast Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Forecast Configuration
          </Typography>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" gutterBottom>
                Forecast Days: {forecastDays}
              </Typography>
              <Slider
                value={forecastDays}
                onChange={(event, value) => setForecastDays(Array.isArray(value) ? value[0] : value)}
                min={1}
                max={30}
                marks={[
                  { value: 1, label: '1d' },
                  { value: 7, label: '7d' },
                  { value: 14, label: '14d' },
                  { value: 30, label: '30d' },
                ]}
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box display="flex" flexDirection="column" gap={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showConfidenceBands}
                      onChange={(e) => setShowConfidenceBands(e.target.checked)}
                    />
                  }
                  label="Show Confidence Bands"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.anomalyDetection}
                      onChange={() => toggleFeature('anomalyDetection')}
                    />
                  }
                  label="Anomaly Detection"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.featureEngineering}
                      onChange={() => toggleFeature('featureEngineering')}
                    />
                  }
                  label="Feature Engineering"
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Anomaly Detection Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Detected Anomalies ({state.anomalies.length})
          </Typography>
          {state.anomalies.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No anomalies detected in the current forecast period.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell align="right">Expected</TableCell>
                    <TableCell align="right">Deviation</TableCell>
                    <TableCell align="center">Severity</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Explanation</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.anomalies.map((anomaly, index) => (
                    <TableRow key={index}>
                      <TableCell>{anomaly.timestamp.toLocaleString()}</TableCell>
                      <TableCell align="right">{anomaly.value.toFixed(2)}</TableCell>
                      <TableCell align="right">{anomaly.expected.toFixed(2)}</TableCell>
                      <TableCell align="right">{(anomaly.deviation * 100).toFixed(1)}%</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={anomaly.severity}
                          size="small"
                          color={anomaly.severity === 'critical' ? 'error' : 
                                 anomaly.severity === 'high' ? 'warning' : 'info'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={anomaly.type}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{anomaly.explanation}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Model Details */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Model Details & Performance
          </Typography>
          {state.selectedModel && (() => {
            const model = state.models.find(m => m.id === state.selectedModel)!;
            return (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box mb={2}>
                    <Typography variant="body2" fontWeight="medium" gutterBottom>
                      {model.name} ({model.type.toUpperCase()})
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {model.description}
                    </Typography>
                  </Box>
                  <Box mb={2}>
                    <Typography variant="body2" fontWeight="medium" gutterBottom>
                      Performance Metrics:
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Accuracy: {(model.accuracy * 100).toFixed(1)}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Confidence: {(model.confidence * 100).toFixed(1)}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Training Data: {model.trainingData} points
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Last Trained: {model.lastTrained.toLocaleDateString()}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box mb={2}>
                    <Typography variant="body2" fontWeight="medium" gutterBottom>
                      Hyperparameters:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {Object.entries(model.hyperparameters).map(([key, value]) => (
                        <Chip
                          key={key}
                          label={`${key}: ${value}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight="medium" gutterBottom>
                      Features Used:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {model.features.map(feature => (
                        <Chip
                          key={feature}
                          label={feature}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            );
          })()}
        </CardContent>
      </Card>
    </AnimatedBox>
  );
};

export default PredictiveAnalytics;