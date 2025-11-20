import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Alert, Table, Progress, Modal } from './DaisyUI';
import {
  CloudArrowUpIcon,
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CogIcon
} from '@heroicons/react/24/outline';

export interface Deployment {
  id: string;
  name: string;
  environment: 'development' | 'staging' | 'production';
  status: 'pending' | 'building' | 'deploying' | 'success' | 'failed';
  buildNumber: number;
  createdAt: Date;
  completedAt?: Date;
  duration?: number;
  logs: string[];
}

export interface DeploymentEnvironment {
  name: string;
  url: string;
  lastDeployment?: Date;
  status: 'idle' | 'building' | 'deploying';
}

const mockDeployments: Deployment[] = [
  {
    id: '1',
    name: 'Production Release v2.1.0',
    environment: 'production',
    status: 'success',
    buildNumber: 1247,
    createdAt: new Date(Date.now() - 3600000),
    completedAt: new Date(Date.now() - 3000000),
    duration: 600,
    logs: ['Build started', 'Tests passed', 'Deployment successful']
  },
  {
    id: '2',
    name: 'Staging Feature Update',
    environment: 'staging',
    status: 'building',
    buildNumber: 1248,
    createdAt: new Date(Date.now() - 600000),
    logs: ['Build started', 'Running tests...']
  },
  {
    id: '3',
    name: 'Development Hotfix',
    environment: 'development',
    status: 'failed',
    buildNumber: 1249,
    createdAt: new Date(Date.now() - 1200000),
    logs: ['Build started', 'Compilation failed']
  },
];

const environments: DeploymentEnvironment[] = [
  { name: 'Development', url: 'dev.example.com', status: 'idle' },
  { name: 'Staging', url: 'staging.example.com', status: 'building' },
  { name: 'Production', url: 'app.example.com', status: 'idle' },
];

const CIDeploymentManager: React.FC = () => {
  const [deployments, setDeployments] = useState<Deployment[]>(mockDeployments);
  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>(environments);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setDeployments(prev => prev.map(deployment => {
        if (deployment.status === 'building' && Math.random() > 0.7) {
          return {
            ...deployment,
            status: Math.random() > 0.2 ? 'success' : 'failed',
            completedAt: new Date(),
            duration: Math.floor(Math.random() * 1200) + 300
          };
        }
        return deployment;
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const startDeployment = (environment: string) => {
    if (isDeploying) return;

    setIsDeploying(true);
    const newDeployment: Deployment = {
      id: Date.now().toString(),
      name: `${environment.charAt(0).toUpperCase() + environment.slice(1)} Release v${Date.now()}`,
      environment: environment as any,
      status: 'pending',
      buildNumber: Math.max(...deployments.map(d => d.buildNumber)) + 1,
      createdAt: new Date(),
      logs: ['Deployment initiated']
    };

    setDeployments(prev => [newDeployment, ...prev]);
    setEnvironments(prev => prev.map(env =>
      env.name === environment.toLowerCase() ? { ...env, status: 'deploying' as any } : env
    ));

    setTimeout(() => {
      setDeployments(prev => prev.map(d =>
        d.id === newDeployment.id ? { ...d, status: 'building' as any, logs: [...d.logs, 'Build started'] } : d
      ));
      setIsDeploying(false);
    }, 1000);
  };

  const getStatusColor = (status: string): 'info' | 'warning' | 'error' | 'success' => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'building':
      case 'deploying': return 'warning';
      case 'pending': return 'info';
      default: return 'info';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircleIcon className="w-5 h-5 text-success" />;
      case 'failed': return <ExclamationTriangleIcon className="w-5 h-5 text-error" />;
      case 'building':
      case 'deploying': return <CogIcon className="w-5 h-5 animate-spin text-warning" />;
      case 'pending': return <ClockIcon className="w-5 h-5 text-info" />;
      default: return <ClockIcon className="w-5 h-5" />;
    }
  };

  const activeDeployments = deployments.filter(d => d.status === 'building' || d.status === 'deploying').length;
  const successfulDeployments = deployments.filter(d => d.status === 'success').length;
  const failedDeployments = deployments.filter(d => d.status === 'failed').length;

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-l-4 border-warning">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CloudArrowUpIcon className="w-8 h-8 text-warning" />
              <div>
                <h2 className="card-title text-2xl">CI/CD Deployment Manager</h2>
                <p className="text-sm opacity-70">Automated deployment pipeline management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={activeDeployments > 0 ? 'warning' : 'success'} size="lg">
                {activeDeployments > 0 ? 'Active' : 'Idle'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow">
          <div className="card-body text-center">
            <CloudArrowUpIcon className="w-8 h-8 mx-auto text-primary mb-2" />
            <div className="text-2xl font-bold">{deployments.length}</div>
            <p className="text-sm opacity-70">Total Deployments</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <CogIcon className="w-8 h-8 mx-auto text-warning mb-2" />
            <div className="text-2xl font-bold">{activeDeployments}</div>
            <p className="text-sm opacity-70">Active</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <CheckCircleIcon className="w-8 h-8 mx-auto text-success mb-2" />
            <div className="text-2xl font-bold">{successfulDeployments}</div>
            <p className="text-sm opacity-70">Successful</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <ExclamationTriangleIcon className="w-8 h-8 mx-auto text-error mb-2" />
            <div className="text-2xl font-bold">{failedDeployments}</div>
            <p className="text-sm opacity-70">Failed</p>
          </div>
        </Card>
      </div>

      {/* Environments */}
      <Card className="shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Environments</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {environments.map((env) => (
              <div key={env.name} className="border border-base-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{env.name}</h4>
                  <Badge variant={env.status === 'idle' ? 'success' : 'warning'} size="sm">
                    {env.status}
                  </Badge>
                </div>
                <p className="text-sm opacity-70 mb-3">{env.url}</p>
                <Button
                  size="sm"
                  className="btn-primary w-full"
                  onClick={() => startDeployment(env.name)}
                  disabled={isDeploying || env.status !== 'idle'}
                >
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Deploy
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Deployments Table */}
      <Card className="shadow-lg">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="card-title text-lg">Deployment History</h3>
            <Button size="sm" className="btn-ghost">
              View All
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table className="table table-zebra table-compact">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Environment</th>
                  <th>Build</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deployments.slice(0, 10).map((deployment) => (
                  <tr key={deployment.id}>
                    <td className="font-medium">{deployment.name}</td>
                    <td>
                      <Badge variant="neutral" size="sm">
                        {deployment.environment}
                      </Badge>
                    </td>
                    <td className="font-mono text-sm">#{deployment.buildNumber}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(deployment.status)}
                        <Badge variant={getStatusColor(deployment.status)} size="sm">
                          {deployment.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="text-sm">
                      {deployment.duration ? `${deployment.duration}s` : '-'}
                    </td>
                    <td className="text-sm opacity-70">
                      {deployment.createdAt.toLocaleTimeString()}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        className="btn-ghost"
                        onClick={() => {
                          setSelectedDeployment(deployment);
                          setShowLogs(true);
                        }}
                      >
                        Logs
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      </Card>

      {activeDeployments > 0 && (
        <Alert variant="warning" className="flex items-center gap-3">
          <CogIcon className="w-5 h-5 animate-spin" />
          <div>
            <p className="font-medium">{activeDeployments} deployment{activeDeployments !== 1 ? 's' : ''} in progress</p>
            <p className="text-sm opacity-70">Monitoring deployment status</p>
          </div>
        </Alert>
      )}

      {/* Logs Modal */}
      <Modal
        open={showLogs}
        onClose={() => setShowLogs(false)}
        title={`Deployment Logs - ${selectedDeployment?.name}`}
      >
        {selectedDeployment && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {getStatusIcon(selectedDeployment.status)}
              <Badge variant={getStatusColor(selectedDeployment.status)}>
                {selectedDeployment.status}
              </Badge>
              <span className="text-sm opacity-70">Build #{selectedDeployment.buildNumber}</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <div className="bg-base-200 rounded-lg p-4 font-mono text-sm space-y-1">
                {selectedDeployment.logs.map((log, index) => (
                  <div key={index} className="opacity-90">
                    [{new Date().toLocaleTimeString()}] {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CIDeploymentManager;