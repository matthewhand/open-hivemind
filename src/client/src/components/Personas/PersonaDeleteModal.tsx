import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../DaisyUI/Modal';
import Button from '../DaisyUI/Button';
import { Persona } from './usePersonasLogic';

interface PersonaDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletingPersona: Persona | null;
  loading: boolean;
  onDelete: (id: string) => void;
}

export const PersonaDeleteModal: React.FC<PersonaDeleteModalProps> = ({
  isOpen,
  onClose,
  deletingPersona,
  loading,
  onDelete,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2 text-error">
          <AlertTriangle className="w-5 h-5" />
          Delete Persona
        </span>
      }
    >
      <div className="py-4">
        <p>
          Are you sure you want to delete <strong>{deletingPersona?.name}</strong>?
        </p>
        <p className="text-sm text-base-content/70 mt-2">
          This action cannot be undone. Bots assigned to this persona will revert to their
          default behavior.
        </p>
      </div>
      <div className="modal-action">
        <Button onClick={onClose} variant="ghost" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={() => deletingPersona && onDelete(deletingPersona.id)}
          variant="error"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? 'Deleting...' : 'Delete Persona'}
        </Button>
      </div>
    </Modal>
  );
};
