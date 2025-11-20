import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Badge,
  Alert,
  Modal,
  Input,
  Select,
  Loading
} from './DaisyUI';
import {
  PlayIcon,
  StopIcon,
  ArrowPathIcon as RefreshIcon,
  CheckCircleIcon,
  XCircleIcon as ErrorIcon,
  ExclamationTriangleIcon as WarningIcon,
  ClockIcon,
  RocketLaunchIcon as DeployIcon,
  ArrowUturnLeftIcon as RollbackIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface PipelineStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  duration?: number;
  logs: string[];
  startTime?: string;
  endTime?: string;
}

interface Deployment {
  id: string;
  name: string;
  environment: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'rolled_back';
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;
  triggeredBy: string;
  commitHash?: string;
  branch?: string;
}

const CIDeploymentManager: React.FC = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [deployForm, setDeployForm] = useState({
    name: '',
    environment: 'staging',
    branch: 'main',
    commitHash: ''
  });

  useEffect(() => {
    loadDeployments();
  }, []);

  const loadDeployments = async () => {
    try {
      setLoading(true);
      const mockDeployments: Deployment[] = [
        {
          id: 'deploy_001',
          name: 'Production Release v2.1.0',
          environment: 'production',
          status: 'success',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T11:15:00Z',
          triggeredBy: 'john.doe@example.com',
          commitHash: 'a1b2c3d4e5f6',
          branch: 'main',
          stages: [
            { id: 'build', name: 'Build', status: 'success', duration: 300, logs: ['Build completed'], startTime: '2024-01-15T10:30:00Z', endTime: '2024-01-15T10:35:00Z' },
            { id: 'test', name: 'Test', status: 'success', duration: 180, logs: ['Tests passed'], startTime: '2024-01-15T10:35:00Z', endTime: '2024-01-15T10:38:00Z' },
            { id: 'deploy', name: 'Deploy', status: 'success', duration: 240, logs: ['Deployment successful'], startTime: '2024-01-15T10:38:00Z', endTime: '2024-01-15T10:42:00Z' }
          ]
        },
        {
          id: 'deploy_002',
          name: 'Staging Update',
          environment: 'staging',
          status: 'running',
          createdAt: '2024-01-15T14:00:00Z',
          updatedAt: '2024-01-15T14:05:00Z',
          triggeredBy: 'jane.smith@example.com',
          commitHash: 'f6e5d4c3b2a1',
          branch: 'feature/new-ui',
          stages: [
            { id: 'build', name: 'Build', status: 'success', duration: 250, logs: ['Build completed'], startTime: '2024-01-15T14:00:00Z', endTime: '2024-01-15T14:04:10Z' },
            { id: 'test', name: 'Test', status: 'running', logs: ['Tests running...'], startTime: '2024-01-15T14:04:10Z' }
          ]
        }
      ];
      setDeployments(mockDeployments);
    } catch (err) {
      setError('Failed to load deployments');
    } finally {
      setLoading(false);
    }
  };

  const handleStartDeployment = async () => {
    if (!deployForm.name.trim()) {
      setError('Deployment name is required');
      return;
    }

    try {
      setLoading(true);
      const newDeployment: Deployment = {
        id: `deploy_${Date.now()}`,
        name: deployForm.name,
        environment: deployForm.environment,
        status: 'running',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        triggeredBy: 'current.user@example.com',
        commitHash: deployForm.commitHash || 'HEAD',
        branch: deployForm.branch,
        stages: [{ id: 'build', name: 'Build', status: 'running', logs: ['Build started...'], startTime: new Date().toISOString() }]
      };

      setDeployments(prev => [newDeployment, ...prev]);
      setSuccess('Deployment started successfully!');
      setDeployDialogOpen(false);
      setDeployForm({ name: '', environment: 'staging', branch: 'main', commitHash: '' });
    } catch (err) {
      setError('Failed to start deployment');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'primary' | 'neutral' => {
    switch (status) {
      case 'success': return 'success';
      case 'running': return 'primary';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      default: return 'neutral';
    }
  };

  const getStageIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircleIcon className="w-5 h-5 text-success" />;
      case 'running': return <Loading.Spinner size="sm" />;
      case 'failed': return <ErrorIcon className="w-5 h-5 text-error" />;
      default: return <ClockIcon className="w-5 h-5 text-warning" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">CI/CD Deployment Manager</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadDeployments} disabled={loading}>
            <RefreshIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="primary" onClick={() => setDeployDialogOpen(true)} disabled={loading}>
            <DeployIcon className="w-4 h-4 mr-2" />
            Start Deployment
          </Button>
        </div>
      </div>

      {error && <Alert status="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert status="success" message={success} onClose={() => setSuccess(null)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {deployments.slice(0, 3).map((deployment) => (
          <Card key={deployment.id} className="shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-bold">{deployment.name}</h2>
                  <p className="text-sm opacity-70">{deployment.environment} • {deployment.branch}</p>
                </div>
                <Badge variant={getStatusColor(deployment.status)}>
                  {deployment.status}
                </Badge>
              </div>

              <div className="text-sm space-y-1 mb-4 opacity-70">
                <p>By: {deployment.triggeredBy}</p>
                <p>Started: {new Date(deployment.createdAt).toLocaleString()}</p>
              </div>

              <div className="mb-4 space-y-2">
                <p className="text-sm font-bold">Pipeline Stages:</p>
                {deployment.stages.map((stage) => (
                  <div key={stage.id} className="flex items-center gap-2">
                    {getStageIcon(stage.status)}
                    <span className="text-sm">{stage.name}</span>
                    {stage.duration && <span className="text-xs opacity-70">({stage.duration}s)</span>}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedDeployment(deployment)}>
                  <ClockIcon className="w-4 h-4 mr-1" />
                  Details
                </Button>
                {deployment.status === 'success' && (
                  <Button size="sm" variant="warning">
                    <RollbackIcon className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="shadow-xl">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">Recent Deployments</h3>
          <div className="space-y-2">
            {deployments.map((deployment) => (
              <div key={deployment.id} className="flex justify-between items-center p-3 border border-base-300 rounded-lg hover:bg-base-200 transition-colors">
                <div>
                  <p className="font-bold">{deployment.name}</p>
                  <p className="text-sm opacity-70">
                    {deployment.triggeredBy} • {new Date(deployment.createdAt).toLocaleString()}
                    {deployment.commitHash && ` • ${deployment.commitHash.substring(0, 7)}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="neutral" size="sm">{deployment.environment}</Badge>
                  <Badge variant={getStatusColor(deployment.status)} size="sm">{deployment.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Deployment Details Modal */}
      {selectedDeployment && (
        <Modal
          isOpen={!!selectedDeployment}
          onClose={() => setSelectedDeployment(null)}
          title={`Deployment Details: ${selectedDeployment.name}`}
        >
          <div className="space-y-4">
            <div>
              <h4 className="font-bold mb-3">Pipeline Progress</h4>
              <div className="space-y-3">
                {selectedDeployment.stages.map((stage) => (
                  <div key={stage.id} className="flex items-start gap-3">
                    {getStageIcon(stage.status)}
                    <div className="flex-grow">
                      <p className="font-bold">{stage.name}</p>
                      {stage.duration && <p className="text-xs opacity-70">Duration: {stage.duration}s</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-2">Logs</h4>
              <div className="bg-base-300 p-3 rounded-lg max-h-60 overflow-auto font-mono text-xs">
                {selectedDeployment.stages.map((stage) => (
                  <div key={stage.id} className="mb-2">
                    <p className="font-bold text-primary">{stage.name}:</p>
                    {stage.logs.map((log, idx) => (
                      <p key={idx}>{log}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-action">
            <Button onClick={() => setSelectedDeployment(null)}>Close</Button>
          </div>
        </Modal>
      )}

      {/* Start Deployment Modal */}
      <Modal
        isOpen={deployDialogOpen}
        onClose={() => setDeployDialogOpen(false)}
        title="Start New Deployment"
      >
        <div className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Deployment Name *</span></label>
            <Input
              value={deployForm.name}
              onChange={(e) => setDeployForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Production Release v2.2.0"
              required
            />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text">Environment</span></label>
            <Select
              value={deployForm.environment}
              onChange={(e) => setDeployForm(prev => ({ ...prev, environment: e.target.value }))}
              options={[
                { value: 'development', label: 'Development' },
                { value: 'staging', label: 'Staging' },
                { value: 'production', label: 'Production' }
              ]}
            />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text">Branch</span></label>
            <Input
              value={deployForm.branch}
              onChange={(e) => setDeployForm(prev => ({ ...prev, branch: e.target.value }))}
              placeholder="main"
            />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text">Commit Hash (optional)</span></label>
            <Input
              value={deployForm.commitHash}
              onChange={(e) => setDeployForm(prev => ({ ...prev, commitHash: e.target.value }))}
              placeholder="HEAD"
            />
          </div>
        </div>

        <div className="modal-action">
          <Button variant="ghost" onClick={() => setDeployDialogOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleStartDeployment}
            disabled={loading || !deployForm.name.trim()}
          >
            {loading ? <Loading.Spinner size="sm" className="mr-2" /> : <DeployIcon className="w-4 h-4 mr-2" />}
            {loading ? 'Starting...' : 'Start Deployment'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default CIDeploymentManager;