import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Paper, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  usePersonas, 
  createPersona, 
  updatePersona, 
  deletePersona 
} from '../../services/agentService';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const PersonaManager: React.FC = () => {
  const { personas, loading, error, refetch } = usePersonas();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPersona, setEditingPersona] = useState<any>(null);
  const [personaForm, setPersonaForm] = useState({ name: '', systemPrompt: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const handleOpenDialog = (persona?: any) => {
    if (persona) {
      setEditingPersona(persona);
      setPersonaForm({ name: persona.name, systemPrompt: persona.systemPrompt });
    } else {
      setEditingPersona(null);
      setPersonaForm({ name: '', systemPrompt: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPersona(null);
  };

  const handleSavePersona = async () => {
    try {
      if (editingPersona) {
        await updatePersona(editingPersona.key, personaForm);
        setSnackbar({ open: true, message: 'Persona updated successfully', severity: 'success' });
      } else {
        // For new personas, we would need to generate a key
        // In a real implementation, this would be handled by the backend
        await createPersona(personaForm);
        setSnackbar({ open: true, message: 'Persona created successfully', severity: 'success' });
      }
      handleCloseDialog();
      refetch();
    } catch (error) {
      setSnackbar({ open: true, message: 'Error saving persona', severity: 'error' });
    }
  };

  const handleDeletePersona = async (key: string) => {
    try {
      await deletePersona(key);
      setSnackbar({ open: true, message: 'Persona deleted successfully', severity: 'success' });
      refetch();
    } catch (error) {
      setSnackbar({ open: true, message: 'Error deleting persona', severity: 'error' });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return <Typography>Loading personas...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Personas</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => handleOpenDialog()}
        >
          Add Persona
        </Button>
      </Box>
      
      <List>
        {personas.map((persona) => (
          <ListItem 
            key={persona.key} 
            secondaryAction={
              <Box>
                <IconButton edge="end" onClick={() => handleOpenDialog(persona)}>
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" onClick={() => handleDeletePersona(persona.key)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            }
          >
            <ListItemText primary={persona.name} secondary={persona.systemPrompt} />
          </ListItem>
        ))}
      </List>
      
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {editingPersona ? 'Edit Persona' : 'Create New Persona'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Persona Name"
            fullWidth
            value={personaForm.name}
            onChange={(e) => setPersonaForm({ ...personaForm, name: e.target.value })}
            sx={{ mt: 1 }}
          />
          <TextField
            margin="dense"
            label="System Prompt"
            fullWidth
            multiline
            rows={4}
            value={personaForm.systemPrompt}
            onChange={(e) => setPersonaForm({ ...personaForm, systemPrompt: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSavePersona} variant="contained">
            {editingPersona ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default PersonaManager;
