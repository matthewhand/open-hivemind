import React, { useState, useEffect } from 'react';
import { Modal, ToastNotification, Checkbox, Button, Card, Form, Loading } from '../DaisyUI';
import {
  getPersonas,
  createPersona,
  updatePersona,
  deletePersona,
  type Persona
} from '../../services/agentService';
import {
  PlusIcon as AddIcon,
  PencilIcon as EditIcon,
  TrashIcon as DeleteIcon,
  ArchiveBoxXMarkIcon as DeleteSweepIcon
} from '@heroicons/react/24/outline';

const PersonaManager: React.FC = () => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [selectedPersonas, setSelectedPersonas] = useState<Set<string>>(new Set());

  const loadPersonas = async () => {
    try {
      setLoading(true);
      const personaList = await getPersonas();
      setPersonas(personaList);
      setError(null);
    } catch {
      setError('Failed to load personas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonas();
  }, []);

  const handleOpenModal = (persona?: Persona) => {
    setEditingPersona(persona || null);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingPersona(null);
  };

  const handleFormSubmit = async (data: Record<string, string | number | boolean>) => {
    const name = data.name as string;
    const systemPrompt = data.systemPrompt as string;

    try {
      if (editingPersona) {
        await updatePersona(editingPersona.key, { name, systemPrompt });
        setToastMessage('Persona updated successfully');
        setToastType('success');
      } else {
        await createPersona({ name, systemPrompt });
        setToastMessage('Persona created successfully');
        setToastType('success');
      }
      handleCloseModal();
      loadPersonas();
    } catch {
      setToastMessage('Error saving persona');
      setToastType('error');
    }
  };

  const handleDeletePersona = async (key: string) => {
    try {
      await deletePersona(key);
      setToastMessage('Persona deleted successfully');
      setToastType('success');
      loadPersonas();
    } catch {
      setToastMessage('Error deleting persona');
      setToastType('error');
    }
  };

  const handleToggleSelect = (key: string) => {
    setSelectedPersonas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedPersonas.size === personas.length) {
      setSelectedPersonas(new Set());
    } else {
      setSelectedPersonas(new Set(personas.map(p => p.key)));
    }
  };

  const handleDeleteSelected = async () => {
    try {
      await Promise.all(Array.from(selectedPersonas).map(key => deletePersona(key)));
      setToastMessage('Selected personas deleted successfully');
      setToastType('success');
      setSelectedPersonas(new Set());
      loadPersonas();
    } catch {
      setToastMessage('Error deleting selected personas');
      setToastType('error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loading.Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  return (
    <Card title="Personas" className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={personas.length > 0 && selectedPersonas.size === personas.length}
            indeterminate={selectedPersonas.size > 0 && selectedPersonas.size < personas.length}
            onChange={handleSelectAll}
            label="Select All"
            size="sm"
          />
          {selectedPersonas.size > 0 && (
            <Button
              variant="secondary"
              style="outline"
              onClick={handleDeleteSelected}
            >
              <DeleteSweepIcon className="w-4 h-4 mr-2" />
              Delete Selected ({selectedPersonas.size})
            </Button>
          )}
        </div>
        <Button
          variant="primary"
          onClick={() => handleOpenModal()}
        >
          <AddIcon className="w-4 h-4 mr-2" />
          Add Persona
        </Button>
      </div>

      <div className="space-y-2">
        {personas.map((persona) => (
          <div key={persona.key} className="flex items-center gap-3 p-3 border border-base-300 rounded-lg hover:bg-base-200">
            <Checkbox
              checked={selectedPersonas.has(persona.key)}
              onChange={() => handleToggleSelect(persona.key)}
              size="sm"
            />
            <div className="flex-grow">
              <p className="font-bold">{persona.name}</p>
              <p className="text-sm opacity-70">{persona.systemPrompt}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenModal(persona)}
                className="btn-square"
              >
                <EditIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeletePersona(persona.key)}
                className="btn-square text-error hover:bg-error hover:text-error-content"
              >
                <DeleteIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={openModal}
        onClose={handleCloseModal}
        title={editingPersona ? 'Edit Persona' : 'Create New Persona'}
      >
        <Form
          onSubmit={handleFormSubmit}
          initialData={editingPersona || { name: '', systemPrompt: '' }}
          fields={[
            {
              name: 'name',
              label: 'Persona Name',
              type: 'text',
              required: true,
              placeholder: 'Enter persona name',
            },
            {
              name: 'systemPrompt',
              label: 'System Prompt',
              type: 'textarea',
              required: true,
              placeholder: 'Enter system prompt for this persona',
            },
          ]}
          submitText={editingPersona ? 'Update' : 'Create'}
          onCancel={handleCloseModal}
          showCancel
        />
      </Modal>

      {toastMessage && (
        <ToastNotification
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage('')}
        />
      )}
    </Card>
  );
};

export default PersonaManager;
