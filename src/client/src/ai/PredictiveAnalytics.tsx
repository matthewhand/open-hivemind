import React, { useState } from 'react';
import { Card, Badge, Button, Progress, Alert } from '../components/DaisyUI';
import {
  TrendingUpIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export interface SimpleModel {
  id: string;
  name: string;
  accuracy: number;
  confidence: number;
}

export interface SimpleAnomaly {
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

const simpleModels: SimpleModel[] = [
  { id: 'prophet', name: 'Prophet Model', accuracy: 87, confidence: 92 },
  { id: 'lstm', name: 'LSTM Neural Network', accuracy: 91, confidence: 88 },
  { id: 'arima', name: 'ARIMA Time Series', accuracy: 84, confidence: 85 },
];

const simpleAnomalies: SimpleAnomaly[] = [
  { timestamp: new Date(), severity: 'high', message: 'Unusual spike in bot activity' },
  { timestamp: new Date(Date.now() - 3600000), severity: 'medium', message: 'Performance degradation detected' },
  { timestamp: new Date(Date.now() - 7200000), severity: 'low', message: 'Minor variance in response time' },
];

export const PredictiveAnalytics: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<string>(simpleModels[0].id);
  const [isPredicting, setIsPredicting] = useState(false);

  const handlePredict = async () => {
    setIsPredicting(true);
    setTimeout(() => setIsPredicting(false), 2000);
  };

  const getSeverityColor = (severity: string): 'info' | 'warning' | 'error' | 'success' => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  };

  const currentModel = simpleModels.find(m => m.id === selectedModel);

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-l-4 border-primary">
        <div className="card-body">
          <div className="flex items-center gap-4">
            <TrendingUpIcon className="w-8 h-8 text-primary" />
            <div>
              <h2 className="card-title text-2xl">Predictive Analytics</h2>
              <p className="text-sm opacity-70">ML-powered forecasting and anomaly detection</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Model Selection */}
      <Card className="shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5" />
            ML Models
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {simpleModels.map(model => (
              <div
                key={model.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedModel === model.id ? 'border-primary bg-primary/10' : 'border-base-300'
                }`}
                onClick={() => setSelectedModel(model.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{model.name}</h4>
                  {selectedModel === model.id && (
                    <Badge variant="success" size="sm">Active</Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Accuracy:</span>
                    <span>{model.accuracy}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Confidence:</span>
                    <span>{model.confidence}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Current Model Performance */}
      {currentModel && (
        <Card className="shadow-lg">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">Model Performance</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Accuracy</span>
                  <span className="text-sm">{currentModel.accuracy}%</span>
                </div>
                <Progress
                  value={currentModel.accuracy}
                  max={100}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Confidence</span>
                  <span className="text-sm">{currentModel.confidence}%</span>
                </div>
                <Progress
                  value={currentModel.confidence}
                  max={100}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Anomaly Detection */}
      <Card className="shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-warning" />
            Recent Anomalies
          </h3>
          <div className="space-y-2">
            {simpleAnomalies.map((anomaly, index) => (
              <Alert key={index} variant={getSeverityColor(anomaly.severity)} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{anomaly.message}</p>
                    <p className="text-xs opacity-70">{anomaly.timestamp.toLocaleString()}</p>
                  </div>
                </div>
                <Badge variant={getSeverityColor(anomaly.severity)} size="sm">
                  {anomaly.severity}
                </Badge>
              </Alert>
            ))}
          </div>
        </div>
      </Card>

      {/* Actions */}
      <Card className="shadow-lg">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Generate Predictions</h3>
              <p className="text-sm opacity-70">Run ML forecasting with selected model</p>
            </div>
            <Button
              onClick={handlePredict}
              disabled={isPredicting}
              className="btn-primary"
            >
              {isPredicting ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Generate Forecast'
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PredictiveAnalytics;