/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import Card from './DaisyUI/Card';
import Button from './DaisyUI/Button';
import { SkeletonList } from './DaisyUI/Skeleton';
import Modal, { ConfirmModal } from './DaisyUI/Modal';
import Input from './DaisyUI/Input';
import Textarea from './DaisyUI/Textarea';
import { Alert } from './DaisyUI/Alert';
import DataTable from './DaisyUI/DataTable';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

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
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

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

      setToast({ show: true, message: 'Persona created successfully', type: 'success' });
      setCreateDialogOpen(false);
      setFormData({ key: '', name: '', systemPrompt: '' });
      fetchPersonas();
    } catch (err) {
      setToast({
        show: true,
        message: err instanceof Error ? err.message : 'Failed to create persona',
        type: 'error',
      });
    }
  };

  const handleEditPersona = async () => {
    if (!selectedPersona) {return;}

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

      setToast({ show: true, message: 'Persona updated successfully', type: 'success' });
      setEditDialogOpen(false);
      setSelectedPersona(null);
      setFormData({ key: '', name: '', systemPrompt: '' });
      fetchPersonas();
    } catch (err) {
      setToast({
        show: true,
        message: err instanceof Error ? err.message : 'Failed to update persona',
        type: 'error',
      });
    }
  };

  const handleDeletePersona = async (personaKey: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Persona',
      message: `Are you sure you want to delete persona "${personaKey}"?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch(`/api/admin/personas/${personaKey}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('Failed to delete persona');
          }

          setToast({ show: true, message: 'Persona deleted successfully', type: 'success' });
          fetchPersonas();
        } catch (err) {
          setToast({
            show: true,
            message: err instanceof Error ? err.message : 'Failed to delete persona',
            type: 'error',
          });
        }
      },
    });
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
      key: formData.key || generateKey(name),
    });
  };

  if (loading) {
    return <div className="min-h-[200px] p-4"><SkeletonList items={4} /></div>;
  }

  const columns = [
    {
      header: 'Key',
      accessor: 'key' as const,
      cell: (persona: Persona) => (
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-base-content/70" />
          <code className="text-sm">{persona.key}</code>
        </div>
      ),
    },
    {
      header: 'Name',
      accessor: 'name' as const,
      cell: (persona: Persona) => (
        <span className="font-medium">{persona.name}</span>
      ),
    },
    {
      header: 'System Prompt',
      accessor: 'systemPrompt' as const,
      cell: (persona: Persona) => (
        <p className="max-w-xs truncate text-sm text-base-content/70">
          {persona.systemPrompt}
        </p>
      ),
    },
    {
      header: 'Actions',
      accessor: 'key' as const,
      cell: (persona: Persona) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            shape="circle"
            color="ghost"
            onClick={() => openEditDialog(persona)}
            title="Edit"
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            shape="circle"
            color="error"
            variant="secondary" className="btn-outline"
            onClick={() => handleDeletePersona(persona.key)}
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Persona Management</h2>
        <Button
          variant="primary"
          startIcon={<PlusIcon className="w-5 h-5" />}
          onClick={openCreateDialog}
        >
          Create Persona
        </Button>
      </div>

      {error && (
        <Alert status="error" message={error} onClose={() => setError(null)} />
      )}

      <DataTable
        columns={columns}
        data={personas}
        searchable
        pagination
        itemsPerPage={10}
      />

      {/* Create Persona Dialog */}
      <Modal
        isOpen={createDialogOpen}
        title="Create New Persona"
        onClose={() => setCreateDialogOpen(false)}
        actions={[
          { label: 'Cancel', onClick: () => setCreateDialogOpen(false), variant: 'ghost' },
          { label: 'Create Persona', onClick: handleCreatePersona, variant: 'primary' },
        ]}
      >
        <div className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text">Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Key</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              required
            />
            <label className="label">
              <span className="label-text-alt">Unique identifier for the persona</span>
            </label>
          </div>

          <div>
            <label className="label">
              <span className="label-text">System Prompt</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={4}
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              required
            />
            <label className="label">
              <span className="label-text-alt">The system prompt that defines the persona's behavior</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Edit Persona Dialog */
      <Modal
        isOpen={editDialogOpen}
        title="Edit Persona"
        onClose={() => setEditDialogOpen(false)}
        actions={[
          { label: 'Cancel', onClick: () => setEditDialogOpen(false), variant: 'ghost' },
          { label: 'Update Persona', onClick: handleEditPersona, variant: 'primary' },
        ]}
      >
        <div className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text">Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Key</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              required
              disabled
            />
            <label className="label">
              <span className="label-text-alt">Unique identifier for the persona</span>
            </label>
          </div>

          <div>
            <label className="label">
              <span className="label-text">System Prompt</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={4}
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              required
            />
            <label className="label">
              <span className="label-text-alt">The system prompt that defines the persona's behavior</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Toast Notifications */
      {toast.show && (
        <div className="toast toast-bottom toast-center z-50" role="status" aria-live="polite">
          <div className={`alert ${toast.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span>{toast.message}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setToast({ ...toast, show: false })} aria-label="Close notification">✕</button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        confirmVariant="error"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default PersonaManager;