import React, { useEffect, useState, useMemo } from 'react';
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Alert } from './DaisyUI/Alert';
import Badge from './DaisyUI/Badge';
import Button from './DaisyUI/Button';
import { SkeletonList } from './DaisyUI/Skeleton';
import Card from './DaisyUI/Card';
import Modal, { ConfirmModal } from './DaisyUI/Modal';
import Input from './DaisyUI/Input';
import Select from './DaisyUI/Select';
import { useConfigDiff } from '../hooks/useConfigDiff';
import { ConfigDiffConfirmDialog } from './ConfigDiffViewer';
import { useSavedStamp } from '../contexts/SavedStampContext';
import { apiService } from '../services/api';

interface ToolUsageGuard {
  id: string;
  name: string;
  description?: string;
  toolId: string;
  guardType: 'owner_only' | 'user_list' | 'role_based';
  allowedUsers: string[];
  allowedRoles: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const ToolUsageGuardsConfig: React.FC = () => {
  const { showStamp } = useSavedStamp();
  const [guards, setGuards] = useState<ToolUsageGuard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingGuard, setEditingGuard] = useState<ToolUsageGuard | null>(null);
  const [formData, setFormData] = useState<Partial<ToolUsageGuard>>({
    name: '',
    toolId: '',
    guardType: 'owner_only',
    allowedUsers: [],
    allowedRoles: [],
    isActive: true,
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
    { value: 'owner_only', label: 'Owner Only' },
    { value: 'user_list', label: 'Specific Users' },
    { value: 'role_based', label: 'User Roles' },
  ];

  const fetchGuards = async () => {
    try {
      setLoading(true);
      setError(null);
      const data: any = await apiService.get('/api/admin/tool-usage-guards');
      setGuards(data.data?.guards || []);
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
        toolId: '',
        guardType: 'owner_only',
        allowedUsers: [],
        allowedRoles: [],
        isActive: true,
      }
    );
    setOpenDialog(true);
    // Snapshot original for diff tracking
    setTimeout(() => {
      const snapshot = guard || {
        name: '',
        toolId: '',
        guardType: 'owner_only',
        allowedUsers: [],
        allowedRoles: [],
        isActive: true,
      };
      setOriginalConfig(snapshot as unknown as Record<string, unknown>);
    }, 0);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingGuard(null);
    setFormData({
      name: '',
      toolId: '',
      guardType: 'owner_only',
      allowedUsers: [],
      allowedRoles: [],
      isActive: true,
    });
  };

  const handleSaveGuard = async () => {
    try {
      const url = editingGuard
        ? `/api/admin/tool-usage-guards/${editingGuard.id}`
        : '/api/admin/tool-usage-guards';

      if (editingGuard) {
        await apiService.put(url, formData);
      } else {
        await apiService.post(url, formData);
      }

      setToast({
        show: true,
        message: `Tool usage guard ${editingGuard ? 'updated' : 'created'} successfully`,
        type: 'success',
      });
      showStamp();
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
          await apiService.delete(`/api/admin/tool-usage-guards/${guardId}`);

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
      await apiService.post(`/api/admin/tool-usage-guards/${guardId}/toggle`, { isActive });

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
          <Card key={guard.id} className="shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <Card.Title tag="h3">{guard.name}</Card.Title>
                  <p className="text-sm text-base-content/70 mt-1">Tool: {guard.toolId}</p>
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
          </Card>
        ))}
      </div>

      <Modal
        isOpen={openDialog}
        title={editingGuard ? 'Edit Tool Usage Guard' : 'Add New Tool Usage Guard'}
        onClose={handleCloseDialog}
        size="lg"
        actions={[
          {
            label: 'Cancel',
            onClick: handleCloseDialog,
            variant: 'ghost',
          },
          {
            label: editingGuard ? 'Update' : 'Create',
            onClick: () => {
              if (editingGuard && hasChanges) {
                setShowDiffConfirm(true);
              } else {
                handleSaveGuard();
              }
            },
            variant: 'primary',
          },
        ]}
      >
        <div className="space-y-4">
          <Input
            label="Guard Name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            fullWidth
          />

          <Input
            label="Tool ID"
            value={formData.toolId || ''}
            onChange={(e) => setFormData({ ...formData, toolId: e.target.value })}
            fullWidth
            helperText="ID of the tool to guard"
          />

          <Input
            label="Description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            helperText="Optional description of this guard"
          />

          <Select
            label="Guard Type"
            value={formData.guardType || 'owner_only'}
            onChange={(e) =>
              setFormData({
                ...formData,
                guardType: e.target.value as 'owner_only' | 'user_list' | 'role_based',
              })
            }
            options={guardTypes}
            fullWidth
          />

          {formData.guardType === 'user_list' && (
            <Input
              label="Allowed Users"
              value={formData.allowedUsers?.join(', ') || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  allowedUsers: e.target.value
                    .split(',')
                    .map((u) => u.trim())
                    .filter((u) => u),
                })
              }
              fullWidth
              helperText="Comma-separated list of user IDs"
            />
          )}

          {formData.guardType === 'role_based' && (
            <Input
              label="Allowed Roles"
              value={formData.allowedRoles?.join(', ') || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  allowedRoles: e.target.value
                    .split(',')
                    .map((r) => r.trim())
                    .filter((r) => r),
                })
              }
              fullWidth
              helperText="Comma-separated list of user roles"
            />
          )}
        </div>
      </Modal>

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
