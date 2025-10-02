import React, { useState, useEffect } from 'react';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [toast, setToast] = useState({ open: false, message: '', type: 'success' as 'success' | 'error' });

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

      setToast({ open: true, message: 'Persona created successfully', type: 'success' });
      setCreateModalOpen(false);
      setFormData({ key: '', name: '', systemPrompt: '' });
      fetchPersonas();
    } catch (err) {
      setToast({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to create persona',
        type: 'error'
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

      setToast({ open: true, message: 'Persona updated successfully', type: 'success' });
      setEditModalOpen(false);
      setSelectedPersona(null);
      setFormData({ key: '', name: '', systemPrompt: '' });
      fetchPersonas();
    } catch (err) {
      setToast({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to update persona',
        type: 'error'
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

      setToast({ open: true, message: 'Persona deleted successfully', type: 'success' });
      fetchPersonas();
    } catch (err) {
      setToast({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to delete persona',
        type: 'error'
      });
    }
  };

  const openEditModal = (persona: Persona) => {
    setSelectedPersona(persona);
    setFormData({
      key: persona.key,
      name: persona.name,
      systemPrompt: persona.systemPrompt,
    });
    setEditModalOpen(true);
  };

  const openCreateModal = () => {
    setFormData({ key: '', name: '', systemPrompt: '' });
    setCreateModalOpen(true);
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
      <div className="flex justify-center items-center min-h-[200px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">
          Persona Management
        </h2>
        <button
          className="btn btn-primary"
          onClick={openCreateModal}
        >
          <AddIcon className="mr-2" />
          Create Persona
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Key</th>
              <th>Name</th>
              <th>System Prompt</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {personas.map((persona) => (
              <tr key={persona.key} className="hover">
                <td>
                  <div className="flex items-center gap-2">
                    <PersonIcon className="text-base-content/60" />
                    <span className="font-mono text-sm">{persona.key}</span>
                  </div>
                </td>
                <td>
                  <span className="font-bold">{persona.name}</span>
                </td>
                <td>
                  <span className="text-base-content/70 max-w-xs truncate block">
                    {persona.systemPrompt}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1">
                    <div className="tooltip" data-tip="Edit">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEditModal(persona)}
                      >
                        <EditIcon />
                      </button>
                    </div>
                    <div className="tooltip" data-tip="Delete">
                      <button
                        className="btn btn-ghost btn-sm text-error"
                        onClick={() => handleDeletePersona(persona.key)}
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Persona Modal */}
      <dialog id="create_persona_modal" className={`modal ${createModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-2xl">
          <h3 className="font-bold text-lg">Create New Persona</h3>
          <div className="py-4 space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Name</span></label>
              <input
                type="text"
                placeholder="Persona Name"
                className="input input-bordered w-full"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Key</span></label>
              <input
                type="text"
                placeholder="unique-key"
                className="input input-bordered w-full"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                required
              />
              <label className="label">
                <span className="label-text-alt">Unique identifier for the persona</span>
              </label>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">System Prompt</span></label>
              <textarea
                className="textarea textarea-bordered h-32"
                placeholder="The system prompt that defines the persona's behavior"
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                required
              ></textarea>
              <label className="label">
                <span className="label-text-alt">The system prompt that defines the persona's behavior</span>
              </label>
            </div>
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn" onClick={() => setCreateModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary ml-2" onClick={handleCreatePersona}>
                Create Persona
              </button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Edit Persona Modal */}
      <dialog id="edit_persona_modal" className={`modal ${editModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-2xl">
          <h3 className="font-bold text-lg">Edit Persona</h3>
          <div className="py-4 space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Name</span></label>
              <input
                type="text"
                placeholder="Persona Name"
                className="input input-bordered w-full"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Key</span></label>
              <input
                type="text"
                placeholder="unique-key"
                className="input input-bordered w-full"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                required
              />
              <label className="label">
                <span className="label-text-alt">Unique identifier for the persona</span>
              </label>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">System Prompt</span></label>
              <textarea
                className="textarea textarea-bordered h-32"
                placeholder="The system prompt that defines the persona's behavior"
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                required
              ></textarea>
              <label className="label">
                <span className="label-text-alt">The system prompt that defines the persona's behavior</span>
              </label>
            </div>
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn" onClick={() => setEditModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary ml-2" onClick={handleEditPersona}>
                Update Persona
              </button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Toast for notifications */}
      {toast.open && (
        <div className="toast toast-end">
          <div className={`alert alert-${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonaManager;