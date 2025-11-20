import React, { useState } from 'react';
import { Card, Badge, Button, Alert, Table } from '../components/DaisyUI';
import {
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';

export interface SimpleAnomaly {
  id: string;
  timestamp: Date;
  type: 'spike' | 'drop' | 'pattern' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  value: number;
  expected: number;
  deviation: number;
  status: 'active' | 'resolved' | 'investigating';
}

const anomalies: SimpleAnomaly[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 300000),
    type: 'spike',
    severity: 'critical',
    metric: 'Response Time',
    value: 4500,
    expected: 1200,
    deviation: 275,
    status: 'active'
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 900000),
    type: 'drop',
    severity: 'high',
    metric: 'Success Rate',
    value: 78,
    expected: 98,
    deviation: -20,
    status: 'investigating'
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 1800000),
    type: 'pattern',
    severity: 'medium',
    metric: 'Memory Usage',
    value: 89,
    expected: 65,
    deviation: 37,
    status: 'active'
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 3600000),
    type: 'error',
    severity: 'low',
    metric: 'Error Rate',
    value: 2.1,
    expected: 0.5,
    deviation: 320,
    status: 'resolved'
  },
];

export const AnomalyDetection: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const handleScan = async () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 3000);
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

  const getStatusColor = (status: string): 'info' | 'warning' | 'error' | 'success' => {
    switch (status) {
      case 'active': return 'error';
      case 'investigating': return 'warning';
      case 'resolved': return 'success';
      default: return 'info';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'spike': return '📈';
      case 'drop': return '📉';
      case 'pattern': return '🔍';
      case 'error': return '⚠️';
      default: return '❓';
    }
  };

  const filteredAnomalies = anomalies.filter(anomaly => {
    const severityMatch = filterSeverity === 'all' || anomaly.severity === filterSeverity;
    const statusMatch = filterStatus === 'all' || anomaly.status === filterStatus;
    return severityMatch && statusMatch;
  });

  const activeAnomalies = anomalies.filter(a => a.status === 'active').length;
  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').length;

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-l-4 border-warning">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-warning" />
              <div>
                <h2 className="card-title text-2xl">Anomaly Detection</h2>
                <p className="text-sm opacity-70">Real-time system anomaly monitoring and alerts</p>
              </div>
            </div>
            <Button
              onClick={handleScan}
              disabled={isScanning}
              className="btn-warning"
            >
              {isScanning ? (
                <>
                  <div className="loading loading-spinner loading-sm mr-2" />
                  Scanning...
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="w-4 h-4 mr-2" />
                  Run Scan
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Alert Summary */}
      {(criticalAnomalies > 0 || activeAnomalies > 0) && (
        <Alert variant={criticalAnomalies > 0 ? 'error' : 'warning'} className="flex items-center gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">
              {criticalAnomalies > 0 ? `${criticalAnomalies} critical anomalies detected!` : `${activeAnomalies} active anomalies`}
            </p>
            <p className="text-sm opacity-70">
              Immediate attention required for critical issues
            </p>
          </div>
        </Alert>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow">
          <div className="card-body text-center">
            <ExclamationTriangleIcon className="w-8 h-8 mx-auto text-error mb-2" />
            <div className="text-2xl font-bold text-error">{criticalAnomalies}</div>
            <p className="text-sm opacity-70">Critical</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <ChartBarIcon className="w-8 h-8 mx-auto text-warning mb-2" />
            <div className="text-2xl font-bold text-warning">{activeAnomalies}</div>
            <p className="text-sm opacity-70">Active</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <ClockIcon className="w-8 h-8 mx-auto text-info mb-2" />
            <div className="text-2xl font-bold text-info">
              {anomalies.filter(a => a.status === 'investigating').length}
            </div>
            <p className="text-sm opacity-70">Investigating</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <ShieldCheckIcon className="w-8 h-8 mx-auto text-success mb-2" />
            <div className="text-2xl font-bold text-success">
              {anomalies.filter(a => a.status === 'resolved').length}
            </div>
            <p className="text-sm opacity-70">Resolved</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow">
        <div className="card-body">
          <h3 className="font-bold mb-3">Filters</h3>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm">Severity:</label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="select select-sm select-bordered"
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="select select-sm select-bordered"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <Button size="sm" className="btn-ghost" onClick={() => {
              setFilterSeverity('all');
              setFilterStatus('all');
            }}>
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Anomalies Table */}
      <Card className="shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Detected Anomalies</h3>
          <div className="overflow-x-auto">
            <Table className="table table-zebra table-compact">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Metric</th>
                  <th>Value vs Expected</th>
                  <th>Deviation</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnomalies.map((anomaly) => (
                  <tr key={anomaly.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getTypeIcon(anomaly.type)}</span>
                        <span className="capitalize">{anomaly.type}</span>
                      </div>
                    </td>
                    <td className="font-medium">{anomaly.metric}</td>
                    <td>
                      <div className="text-sm">
                        <span className="font-mono">{anomaly.value}</span>
                        <span className="opacity-50 mx-1">vs</span>
                        <span className="font-mono opacity-70">{anomaly.expected}</span>
                      </div>
                    </td>
                    <td>
                      <Badge
                        variant={anomaly.deviation > 100 ? 'error' : 'warning'}
                        size="sm"
                      >
                        {anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation}%
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={getSeverityColor(anomaly.severity)} size="sm">
                        {anomaly.severity}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={getStatusColor(anomaly.status)} size="sm">
                        {anomaly.status}
                      </Badge>
                    </td>
                    <td className="text-sm opacity-70">
                      {anomaly.timestamp.toLocaleTimeString()}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Button size="sm" className="btn-ghost btn-xs">
                          View
                        </Button>
                        {anomaly.status !== 'resolved' && (
                          <Button size="sm" className="btn-ghost btn-xs">
                            Investigate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      </Card>

      {/* Detection Settings */}
      <Card className="shadow">
        <div className="card-body">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <BeakerIcon className="w-5 h-5" />
            Detection Sensitivity
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm opacity-70">Threshold Sensitivity</label>
              <select className="select select-sm select-bordered w-full mt-1">
                <option>High (Most Sensitive)</option>
                <option selected>Medium</option>
                <option>Low (Least Sensitive)</option>
              </select>
            </div>
            <div>
              <label className="text-sm opacity-70">Scan Frequency</label>
              <select className="select select-sm select-bordered w-full mt-1">
                <option>Every 1 minute</option>
                <option selected>Every 5 minutes</option>
                <option>Every 15 minutes</option>
              </select>
            </div>
            <div>
              <label className="text-sm opacity-70">Auto-Resolve Threshold</label>
              <select className="select select-sm select-bordered w-full mt-1">
                <option>Never</option>
                <option selected>After 1 hour</option>
                <option>After 24 hours</option>
              </select>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AnomalyDetection;