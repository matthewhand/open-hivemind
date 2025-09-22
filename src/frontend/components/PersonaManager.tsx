import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

interface Persona {
  key: string;
  name: string;
  systemPrompt: string;
}

const PersonaManager: React.FC = () => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Form state
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    systemPrompt: '',
  });

  const fetchPersonas = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the admin API endpoint for personas
      const response = await fetch('/api/admin/personas');
      if (!response.ok) {
        throw new Error('Failed to fetch personas');
      }
      const data = await response.json();

      setPersonas(data.personas || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch personas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  const handleCreatePersona = async () => {
    try {
      const response = await fetch('/api/admin/personas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create persona');
      }

      setSnackbar({ open: true, message: 'Persona created successfully', severity: 'success' });
      setCreateDialogOpen(false);
      setFormData({ key: '', name: '', systemPrompt: '' });
      fetchPersonas();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to create persona',
        severity: 'error'
      });
    }
  };

  const handleEditPersona = async () => {
    if (!selectedPersona) return;

    try {
      const response = await fetch(`/api/admin/personas/${selectedPersona.key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          systemPrompt: formData.systemPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update persona');
      }

      setSnackbar({ open: true, message: 'Persona updated successfully', severity: 'success' });
      setEditDialogOpen(false);
      setSelectedPersona(null);
      setFormData({ key: '', name: '', systemPrompt: '' });
      fetchPersonas();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to update persona',
        severity: 'error'
      });
    }
  };

  const handleDeletePersona = async (personaKey: string) => {
    if (!confirm(`Are you sure you want to delete persona "${personaKey}"?`)) return;

    try {
      const response = await fetch(`/api/admin/personas/${personaKey}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete persona');
      }

      setSnackbar({ open: true, message: 'Persona deleted successfully', severity: 'success' });
      fetchPersonas();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to delete persona',
        severity: 'error'
      });
    }
  };

  const openEditDialog = (persona: Persona) => {
    setSelectedPersona(persona);
    setFormData({
      key: persona.key,
      name: persona.name,
      systemPrompt: persona.systemPrompt,
    });
    setEditDialogOpen(true);
  };

  const openCreateDialog = () => {
    setFormData({ key: '', name: '', systemPrompt: '' });
    setCreateDialogOpen(true);
  };

  const generateKey = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      key: formData.key || generateKey(name)
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Persona Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          Create Persona
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box>
        {personas.map((persona) => (
          <Accordion key={persona.key} sx={{ mb: 2 }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Box display="flex" alignItems="center" gap={2} width="100%">
                <PersonIcon color="primary" />
                <Box flex={1}>
                  <Typography variant="h6" component="div">
                    {persona.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontFamily="monospace">
                    Key: {persona.key}
                  </Typography>
                </Box>
                <Box display="flex" gap={1}>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => openEditDialog(persona)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => handleDeletePersona(persona.key)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    System Prompt
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {persona.systemPrompt}
                  </Typography>
                </CardContent>
              </Card>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Create Persona Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Persona</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Key"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              required
              helperText="Unique identifier for the persona"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="System Prompt"
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              required
              helperText="The system prompt that defines the persona's behavior"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreatePersona} variant="contained">
            Create Persona
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Persona Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Persona</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Key"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              required
              helperText="Unique identifier for the persona"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="System Prompt"
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              required
              helperText="The system prompt that defines the persona's behavior"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditPersona} variant="contained">
            Update Persona
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PersonaManager;