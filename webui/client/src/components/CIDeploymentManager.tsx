import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  IconButton,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Timeline as TimelineIcon,
  Build as BuildIcon,
  DeployedCode as DeployIcon,
  Undo as RollbackIcon,
} from '@mui/icons-material';
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

interface DriftDetection {
  environment: string;
  detectedAt: string;
  changes: Array<{
    type: 'added' | 'removed' | 'modified';
    path: string;
    currentValue: any;
    expectedValue: any;
  }>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const CIDeploymentManager: React.FC = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [driftDetections, setDriftDetections] = useState<DriftDetection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);

  // Form data
  const [deployForm, setDeployForm] = useState({
    name: '',
    environment: 'staging',
    branch: 'main',
    commitHash: ''
  });

  useEffect(() => {
    loadDeployments();
    loadDriftDetections();
  }, []);

  const loadDeployments = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from an API
      // For now, we'll simulate deployment data
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
            {
              id: 'build',
              name: 'Build',
              status: 'success',
              duration: 300,
              logs: ['Build started', 'Dependencies installed', 'Tests passed', 'Build completed'],
              startTime: '2024-01-15T10:30:00Z',
              endTime: '2024-01-15T10:35:00Z'
            },
            {
              id: 'test',
              name: 'Test',
              status: 'success',
              duration: 180,
              logs: ['Unit tests started', 'Integration tests passed', 'E2E tests completed'],
              startTime: '2024-01-15T10:35:00Z',
              endTime: '2024-01-15T10:38:00Z'
            },
            {
              id: 'deploy',
              name: 'Deploy',
              status: 'success',
              duration: 240,
              logs: ['Deployment started', 'Configuration validated', 'Services restarted', 'Health checks passed'],
              startTime: '2024-01-15T10:38:00Z',
              endTime: '2024-01-15T10:42:00Z'
            }
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
            {
              id: 'build',
              name: 'Build',
              status: 'success',
              duration: 250,
              logs: ['Build started', 'Dependencies installed', 'Build completed'],
              startTime: '2024-01-15T14:00:00Z',
              endTime: '2024-01-15T14:04:10Z'
            },
            {
              id: 'test',
              name: 'Test',
              status: 'running',
              logs: ['Unit tests started', 'Integration tests running...'],
              startTime: '2024-01-15T14:04:10Z'
            }
          ]
        }
      ];
      setDeployments(mockDeployments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deployments');
    } finally {
      setLoading(false);
    }
  };

  const loadDriftDetections = async () => {
    try {
      // In a real implementation, this would fetch from an API
      const mockDrifts: DriftDetection[] = [
        {
          environment: 'production',
          detectedAt: '2024-01-15T12:00:00Z',
          severity: 'medium',
          changes: [
            {
              type: 'modified',
              path: 'bots.main.llmProvider',
              currentValue: 'openai',
              expectedValue: 'anthropic'
            }
          ]
        }
      ];
      setDriftDetections(mockDrifts);
    } catch (err) {
      console.error('Failed to load drift detections:', err);
    }
  };

  const handleStartDeployment = async () => {
    if (!deployForm.name.trim()) {
      setError('Deployment name is required');
      return;
    }

    try {
      setLoading(true);
      // In a real implementation, this would trigger a deployment via API
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
        stages: [
          {
            id: 'build',
            name: 'Build',
            status: 'running',
            logs: ['Build started...'],
            startTime: new Date().toISOString()
          }
        ]
      };

      setDeployments(prev => [newDeployment, ...prev]);
      setSuccess('Deployment started successfully!');
      setDeployDialogOpen(false);
      setDeployForm({ name: '', environment: 'staging', branch: 'main', commitHash: '' });

      // Simulate deployment progress
      simulateDeploymentProgress(newDeployment.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start deployment');
    } finally {
      setLoading(false);
    }
  };

  const simulateDeploymentProgress = (deploymentId: string) => {
    // Simulate deployment stages progressing
    setTimeout(() => {
      setDeployments(prev => prev.map(deploy => {
        if (deploy.id === deploymentId) {
          return {
            ...deploy,
            stages: deploy.stages.map(stage => ({
              ...stage,
              status: 'success' as const,
              endTime: new Date().toISOString(),
              duration: 300
            })),
            status: 'success' as const,
            updatedAt: new Date().toISOString()
          };
        }
        return deploy;
      }));
    }, 5000);
  };

  const handleRollback = async (deployment: Deployment) => {
    try {
      setLoading(true);
      // In a real implementation, this would trigger a rollback via API
      setDeployments(prev => prev.map(deploy => {
        if (deploy.id === deployment.id) {
          return {
            ...deploy,
            status: 'rolled_back' as const,
            updatedAt: new Date().toISOString()
          };
        }
        return deploy;
      }));
      setSuccess(`Deployment ${deployment.name} rolled back successfully!`);
      setRollbackDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback deployment');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'running': return 'primary';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      case 'rolled_back': return 'secondary';
      default: return 'default';
    }
  };

  const getStageIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircleIcon color="success" />;
      case 'running': return <CircularProgress size={20} />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'pending': return <WarningIcon color="warning" />;
      default: return <BuildIcon />;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          CI/CD Deployment Manager
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => { loadDeployments(); loadDriftDetections(); }}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<DeployIcon />}
            onClick={() => setDeployDialogOpen(true)}
            disabled={loading}
          >
            Start Deployment
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Drift Detection Alerts */}
      {driftDetections.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Configuration Drift Detected
          </Typography>
          {driftDetections.map((drift, index) => (
            <Typography key={index} variant="body2">
              {drift.environment}: {drift.changes.length} changes detected
            </Typography>
          ))}
        </Alert>
      )}

      {/* Deployment Pipeline Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {deployments.slice(0, 3).map((deployment) => (
          <Grid item xs={12} md={6} lg={4} key={deployment.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
                      {deployment.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {deployment.environment} • {deployment.branch}
                    </Typography>
                  </Box>
                  <Chip
                    label={deployment.status}
                    color={getStatusColor(deployment.status)}
                    size="small"
                  />
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    Triggered by: {deployment.triggeredBy}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Started: {new Date(deployment.createdAt).toLocaleString()}
                  </Typography>
                </Box>

                {/* Pipeline Stages */}
                <Box mb={2}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Pipeline Stages:
                  </Typography>
                  {deployment.stages.map((stage, index) => (
                    <Box key={stage.id} display="flex" alignItems="center" sx={{ mb: 0.5 }}>
                      {getStageIcon(stage.status)}
                      <Typography variant="body2" sx={{ ml: 1, mr: 1 }}>
                        {stage.name}
                      </Typography>
                      {stage.duration && (
                        <Typography variant="caption" color="text.secondary">
                          ({stage.duration}s)
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>

                <Box display="flex" gap={1}>
                  <Button
                    size="small"
                    startIcon={<TimelineIcon />}
                    onClick={() => setSelectedDeployment(deployment)}
                  >
                    Details
                  </Button>
                  {deployment.status === 'success' && (
                    <Button
                      size="small"
                      startIcon={<RollbackIcon />}
                      onClick={() => {
                        setSelectedDeployment(deployment);
                        setRollbackDialogOpen(true);
                      }}
                      color="warning"
                    >
                      Rollback
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Deployments List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Deployments
          </Typography>
          <List dense>
            {deployments.map((deployment) => (
              <ListItem key={deployment.id} divider>
                <ListItemText
                  primary={
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body1">{deployment.name}</Typography>
                      <Box display="flex" gap={1}>
                        <Chip
                          label={deployment.environment}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={deployment.status}
                          size="small"
                          color={getStatusColor(deployment.status)}
                        />
                      </Box>
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {deployment.triggeredBy} • {new Date(deployment.createdAt).toLocaleString()}
                      {deployment.commitHash && ` • ${deployment.commitHash.substring(0, 7)}`}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Deployment Details Dialog */}
      {selectedDeployment && (
        <Dialog
          open={!!selectedDeployment}
          onClose={() => setSelectedDeployment(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Deployment Details: {selectedDeployment.name}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Pipeline Progress
              </Typography>
              <Stepper activeStep={selectedDeployment.stages.findIndex(s => s.status === 'running')} orientation="vertical">
                {selectedDeployment.stages.map((stage) => (
                  <Step key={stage.id} completed={stage.status === 'success'}>
                    <StepLabel
                      icon={getStageIcon(stage.status)}
                      error={stage.status === 'failed'}
                    >
                      <Box>
                        <Typography variant="body1">{stage.name}</Typography>
                        {stage.duration && (
                          <Typography variant="caption" color="text.secondary">
                            Duration: {stage.duration}s
                          </Typography>
                        )}
                      </Box>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            <Typography variant="h6" gutterBottom>
              Logs
            </Typography>
            <Paper sx={{ p: 2, maxHeight: 300, overflow: 'auto', bgcolor: 'grey.900', color: 'grey.100' }}>
              {selectedDeployment.stages.map((stage) => (
                <Box key={stage.id} sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.light' }}>
                    {stage.name}:
                  </Typography>
                  {stage.logs.map((log, index) => (
                    <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {log}
                    </Typography>
                  ))}
                </Box>
              ))}
            </Paper>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedDeployment(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Start Deployment Dialog */}
      <Dialog open={deployDialogOpen} onClose={() => setDeployDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start New Deployment</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Deployment Name"
            value={deployForm.name}
            onChange={(e) => setDeployForm(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
            required
          />
          <TextField
            fullWidth
            label="Environment"
            select
            value={deployForm.environment}
            onChange={(e) => setDeployForm(prev => ({ ...prev, environment: e.target.value }))}
            sx={{ mb: 2 }}
          >
            <MenuItem value="development">Development</MenuItem>
            <MenuItem value="staging">Staging</MenuItem>
            <MenuItem value="production">Production</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="Branch"
            value={deployForm.branch}
            onChange={(e) => setDeployForm(prev => ({ ...prev, branch: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Commit Hash (optional)"
            value={deployForm.commitHash}
            onChange={(e) => setDeployForm(prev => ({ ...prev, commitHash: e.target.value }))}
            sx={{ mb: 2 }}
            placeholder="HEAD"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeployDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleStartDeployment}
            variant="contained"
            disabled={loading || !deployForm.name.trim()}
          >
            {loading ? <CircularProgress size={20} /> : 'Start Deployment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rollback Confirmation Dialog */}
      <Dialog open={rollbackDialogOpen} onClose={() => setRollbackDialogOpen(false)}>
        <DialogTitle>Confirm Rollback</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to rollback to deployment "{selectedDeployment?.name}"?
            This will revert the system to the state before this deployment.
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone and may cause service interruption.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => selectedDeployment && handleRollback(selectedDeployment)}
            variant="contained"
            color="warning"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Confirm Rollback'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CIDeploymentManager;