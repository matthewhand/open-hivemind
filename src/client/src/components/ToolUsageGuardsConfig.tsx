import React, { useEffect, useState, useMemo } from 'react';
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Alert } from './DaisyUI/Alert';
import Badge from './DaisyUI/Badge';
import Button from './DaisyUI/Button';
import { SkeletonList } from './DaisyUI/Skeleton';
import Card from './DaisyUI/Card';
import { ConfirmModal } from './DaisyUI/Modal';
import Input from './DaisyUI/Input';
import Select from './DaisyUI/Select';
import { useConfigDiff } from '../hooks/useConfigDiff';
import { ConfigDiffConfirmDialog } from './ConfigDiffViewer';

interface ToolUsageGuard {
  id: string;
  name: string;
  toolName: string;
  guardType: 'owner' | 'userList' | 'role';
  config: {
    allowedUsers?: string[];
    allowedRoles?: string[];
    ownerOnly?: boolean;
  };
  isActive: boolean;
}

const ToolUsageGuardsConfig: React.FC = () => {
  const [guards, setGuards] = useState<ToolUsageGuard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingGuard, setEditingGuard] = useState<ToolUsageGuard | null>(null);
  const [formData, setFormData] = useState<Partial<ToolUsageGuard>>({
    name: '',
    toolName: '',
    guardType: 'owner',
    config: {
      allowedUsers: [],
      allowedRoles: [],
      ownerOnly: false,
    },
  });
  const [showDiffConfirm, setShowDiffConfirm] = useState(false);

  const formDataAsRecord = useMemo(() => formData as unknown as Record<string, unknown>, [formData]);
  const { hasChanges, diff, setOriginalConfig, resetToOriginal } = useConfigDiff(formDataAsRecord);

  const handleUndoAll = () => {
    const original = resetToOriginal();
    setFormData(original as Partial<ToolUsageGuard>);
  };

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>(
    {
      show: false,
      message: '',
      type: 'success',
    }
  );
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const guardTypes = [
    { value: 'owner', label: 'Owner Only' },
    { value: 'userList', label: 'Specific Users' },
    { value: 'role', label: 'User Roles' },
  ];

  const fetchGuards = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/tool-usage-guards');
      if (!response.ok) {
        throw new Error('Failed to fetch tool usage guards');
      }
      const data = await response.json();
      setGuards(data.guards || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tool usage guards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuards();
  }, []);

  const handleOpenDialog = (guard?: ToolUsageGuard) => {
    setEditingGuard(guard || null);
    setFormData(
      guard || {
        name: '',
        toolName: '',
        guardType: 'owner',
        config: {
          allowedUsers: [],
          allowedRoles: [],
          ownerOnly: false,
        },
      }
    );
    setOpenDialog(true);
    // Snapshot original for diff tracking
    setTimeout(() => {
      const snapshot = guard || {
        name: '',
        toolName: '',
        guardType: 'owner',
        config: { allowedUsers: [], allowedRoles: [], ownerOnly: false },
      };
      setOriginalConfig(snapshot as unknown as Record<string, unknown>);
    }, 0);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingGuard(null);
    setFormData({
      name: '',
      toolName: '',
      guardType: 'owner',
      config: {
        allowedUsers: [],
        allowedRoles: [],
        ownerOnly: false,
      },
    });
  };

  const handleSaveGuard = async () => {
    try {
      const url = editingGuard
        ? `/api/admin/tool-usage-guards/${editingGuard.id}`
        : '/api/admin/tool-usage-guards';

      const method = editingGuard ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingGuard ? 'update' : 'create'} tool usage guard`);
      }

      setToast({
        show: true,
        message: `Tool usage guard ${editingGuard ? 'updated' : 'created'} successfully`,
        type: 'success',
      });
      handleCloseDialog();
      fetchGuards();
    } catch (err) {
      setToast({
        show: true,
        message:
          err instanceof Error
            ? err.message
            : `Failed to ${editingGuard ? 'update' : 'create'} tool usage guard`,
        type: 'error',
      });
    }
  };

  const handleDeleteGuard = async (guardId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Tool Usage Guard',
      message: 'Are you sure you want to delete this tool usage guard?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch(`/api/admin/tool-usage-guards/${guardId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('Failed to delete tool usage guard');
          }

          setToast({
            show: true,
            message: 'Tool usage guard deleted successfully',
            type: 'success',
          });
          fetchGuards();
        } catch (err) {
          setToast({
            show: true,
            message: err instanceof Error ? err.message : 'Failed to delete tool usage guard',
            type: 'error',
          });
        }
      },
    });
  };

  const handleToggleActive = async (guardId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/tool-usage-guards/${guardId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update guard status');
      }

      fetchGuards();
    } catch (err) {
      setToast({
        show: true,
        message: err instanceof Error ? err.message : 'Failed to update guard status',
        type: 'error',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[200px] p-4">
        <SkeletonList items={4} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Tool Usage Guards</h2>
        <Button
          variant="primary"
          startIcon={<PlusIcon className="w-5 h-5" />}
          onClick={() => handleOpenDialog()}
        >
          Add Tool Usage Guard
        </Button>
      </div>

      {error && <Alert status="error" message={error} onClose={() => setError(null)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {guards.map((guard) => (
          <Card key={guard.id} className="bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="card-title">{guard.name}</h3>
                  <p className="text-sm text-base-content/70 mt-1">Tool: {guard.toolName}</p>
                  <div className="mt-2">
                    <Badge variant="primary">{guard.guardType}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={guard.isActive ? 'success' : 'neutral'}>
                    {guard.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    size="sm"
                    shape="circle"
                    color="ghost"
                    onClick={() => handleOpenDialog(guard)}
                    aria-label={`Edit ${guard.name} guard`}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    shape="circle"
                    color="error"
                    variant="secondary"
                    className="btn-outline"
                    onClick={() => handleDeleteGuard(guard.id)}
                    aria-label={`Delete ${guard.name} guard`}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4">
                <span className="text-sm text-base-content/70">
                  Status: {guard.isActive ? 'Active' : 'Inactive'}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  className="btn-outline"
                  onClick={() => handleToggleActive(guard.id, !guard.isActive)}
                >
                  {guard.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <ModalForm
        open={openDialog}
        title={editingGuard ? 'Edit Tool Usage Guard' : 'Add New Tool Usage Guard'}
        onClose={handleCloseDialog}
        onSubmit={() => {
          if (editingGuard && hasChanges) {
            setShowDiffConfirm(true);
          } else {
            handleSaveGuard();
          }
        }}
        submitLabel={editingGuard ? 'Update' : 'Create'}
      >
        <div className="space-y-4">
          <Input
            label="Guard Name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            fullWidth
          />

          <Input
            label="Tool Name"
            value={formData.toolName || ''}
            onChange={(e) => setFormData({ ...formData, toolName: e.target.value })}
            fullWidth
            helperText="Name of the tool to guard"
          />

          <Select
            label="Guard Type"
            value={formData.guardType || 'owner'}
            onChange={(e) =>
              setFormData({
                ...formData,
                guardType: e.target.value as 'owner' | 'userList' | 'role',
              })
            }
            options={guardTypes}
            fullWidth
          />

          {formData.guardType === 'owner' && (
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-4">
                <span className="label-text">Owner Only</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={formData.config?.ownerOnly || false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, ownerOnly: e.target.checked },
                    })
                  }
                />
              </label>
            </div>
          )}

          {formData.guardType === 'userList' && (
            <Input
              label="Allowed Users"
              value={formData.config?.allowedUsers?.join(', ') || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: {
                    ...formData.config,
                    allowedUsers: e.target.value
                      .split(',')
                      .map((u) => u.trim())
                      .filter((u) => u),
                  },
                })
              }
              fullWidth
              helperText="Comma-separated list of user IDs"
            />
          )}

          {formData.guardType === 'role' && (
            <Input
              label="Allowed Roles"
              value={formData.config?.allowedRoles?.join(', ') || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: {
                    ...formData.config,
                    allowedRoles: e.target.value
                      .split(',')
                      .map((r) => r.trim())
                      .filter((r) => r),
                  },
                })
              }
              fullWidth
              helperText="Comma-separated list of user roles"
            />
          )}
        </div>
      </ModalForm>

      {toast.show && (
        <div className="toast toast-bottom toast-center z-50" role="status" aria-live="polite">
          <div className={`alert ${toast.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span>{toast.message}</span>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setToast({ ...toast, show: false })}
              aria-label="Close message"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <ConfigDiffConfirmDialog
        isOpen={showDiffConfirm}
        diff={diff}
        onConfirm={() => { setShowDiffConfirm(false); handleSaveGuard(); }}
        onCancel={() => setShowDiffConfirm(false)}
        title="Confirm Guard Changes"
      />

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

export default ToolUsageGuardsConfig;
