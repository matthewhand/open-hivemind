import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useAgents } from '../hooks/useAgents';
import { Agent, createAgent, updateAgent, deleteAgent } from '../services/agentService';
import AdminLayout from '../components/Admin/AdminLayout';

const AgentManagementPage: React.FC = () => {
  const { agents, loading, error, refetch } = useAgents();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    persona: '',
    status: 'offline' as 'online' | 'offline' | 'idle',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleOpenDialog = (agent?: Agent) => {
    if (agent) {
      setEditingAgent(agent);
      setFormData({
        name: agent.name,
        persona: agent.persona,
        status: agent.status,
      });
    } else {
      setEditingAgent(null);
      setFormData({
        name: '',
        persona: '',
        status: 'offline',
      });
    }
    setOpenDialog(true);
    setSubmitError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAgent(null);
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      if (editingAgent) {
        await updateAgent(editingAgent.id, formData);
      } else {
        await createAgent(formData);
      }
      await refetch();
      handleCloseDialog();
    } catch (err) {
      setSubmitError('Failed to save agent');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (agentId: string) => {
    if (window.confirm('Are you sure you want to delete this agent?')) {
      try {
        await deleteAgent(agentId);
        await refetch();
      } catch (err) {
        setSubmitError('Failed to delete agent');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'error';
      case 'idle': return 'warning';
      default: return 'default';
    }
  };

  return (
    <AdminLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Agent Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New Agent
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Persona</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Seen</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="medium">
                      {agent.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{agent.persona}</TableCell>
                  <TableCell>
                    <Chip
                      label={agent.status}
                      color={getStatusColor(agent.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(agent.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(agent.lastSeen).toLocaleString()}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(agent)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(agent.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingAgent ? 'Edit Agent' : 'Add New Agent'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Agent Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Persona"
              value={formData.persona}
              onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <MenuItem value="online">Online</MenuItem>
                <MenuItem value="offline">Offline</MenuItem>
                <MenuItem value="idle">Idle</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !formData.name.trim()}
            startIcon={submitting ? <CircularProgress size={16} /> : null}
          >
            {submitting ? 'Saving...' : editingAgent ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};

export default AgentManagementPage;