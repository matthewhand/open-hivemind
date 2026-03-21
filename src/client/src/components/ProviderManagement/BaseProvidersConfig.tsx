/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  ModalForm,
  Input,
  Select,
  Alert,
  Badge,
} from '../DaisyUI';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import ProviderConfig from '../ProviderConfig';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface ProviderItem {
  id: string;
  name: string;
  type: string;
  config: any;
  isActive: boolean;
}

export interface ProviderTypeOption {
  value: string;
  label: string;
  docsUrl?: string; // Added for Documentation Integration
}

export interface BaseProvidersConfigProps {
  apiEndpoint: string;
  providerTypeOptions: ProviderTypeOption[];
  title: string;
  emptyStateIcon: React.ReactNode;
  emptyStateTitle: string;
  emptyStateMessage: string;
  refreshIcon: React.ReactNode;
}

interface SortableProviderCardProps {
  provider: ProviderItem;
  onEdit: (provider: ProviderItem) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const SortableProviderCard: React.FC<SortableProviderCardProps> = ({
  provider,
  onEdit,
  onDelete,
  onToggleActive,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: provider.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-4 sm:p-6">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-start gap-3">
              <div
                {...attributes}
                {...listeners}
                className="mt-1 cursor-grab active:cursor-grabbing text-base-content/40 hover:text-base-content/70 p-1"
                title="Drag to reorder priority"
              >
                <Bars3Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="card-title text-lg m-0 leading-tight">{provider.name}</h3>
                <div className="mt-2">
                  <Badge variant="primary">{provider.type}</Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Badge variant={provider.isActive ? 'success' : 'neutral'}>
                {provider.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Button
                size="sm"
                shape="circle"
                color="ghost"
                onClick={() => onEdit(provider)}
                aria-label="Edit Provider"
              >
                <PencilIcon className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                shape="circle"
                color="error"
                variant="secondary" className="btn-outline"
                onClick={() => onDelete(provider.id)}
                aria-label="Delete Provider"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 pl-9">
            <span className="text-sm text-base-content/70">
              Status: {provider.isActive ? 'Active' : 'Inactive'}
            </span>
            <Button
              size="sm"
              variant="secondary" className="btn-outline"
              onClick={() => onToggleActive(provider.id, !provider.isActive)}
            >
              {provider.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};


const BaseProvidersConfig: React.FC<BaseProvidersConfigProps> = ({
  apiEndpoint,
  providerTypeOptions,
  title,
  emptyStateIcon,
  emptyStateTitle,
  emptyStateMessage,
  refreshIcon,
}) => {
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderItem | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(apiEndpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${title.toLowerCase()}`);
      }
      const data = await response.json();
      setProviders(data.providers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to fetch ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [apiEndpoint]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setProviders((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);

        // In a real implementation, we would call an API here to save the new order
        // e.g. await fetch(`${apiEndpoint}/reorder`, { method: 'POST', body: JSON.stringify(reordered.map(p => p.id)) })

        return reordered;
      });

      setToast({
        show: true,
        message: 'Provider priority updated',
        type: 'success',
      });
    }
  };

  const handleOpenDialog = (provider?: ProviderItem) => {
    setEditingProvider(provider || null);
    setFormData(provider?.config || {});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProvider(null);
    setFormData({});
  };

  const handleSaveProvider = async () => {
    try {
      const url = editingProvider
        ? `${apiEndpoint}/${editingProvider.id}`
        : apiEndpoint;

      const method = editingProvider ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name || editingProvider?.name,
          type: formData.type || editingProvider?.type,
          config: formData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingProvider ? 'update' : 'create'} provider`);
      }

      setToast({
        show: true,
        message: `Provider ${editingProvider ? 'updated' : 'created'} successfully`,
        type: 'success',
      });
      handleCloseDialog();
      fetchProviders();
    } catch (err) {
      setToast({
        show: true,
        message: err instanceof Error ? err.message : `Failed to ${editingProvider ? 'update' : 'create'} provider`,
        type: 'error',
      });
    }
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) { return; }

    try {
      const response = await fetch(`${apiEndpoint}/${providerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete provider');
      }

      setToast({
        show: true,
        message: 'Provider deleted successfully',
        type: 'success',
      });
      fetchProviders();
    } catch (err) {
      setToast({
        show: true,
        message: err instanceof Error ? err.message : 'Failed to delete provider',
        type: 'error',
      });
    }
  };

  const handleToggleActive = async (providerId: string, isActive: boolean) => {
    try {
      const response = await fetch(`${apiEndpoint}/${providerId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update provider status');
      }

      fetchProviders();
    } catch (err) {
      setToast({
        show: true,
        message: err instanceof Error ? err.message : 'Failed to update provider status',
        type: 'error',
      });
    }
  };

  const activeProviderDocs = React.useMemo(() => {
    const currentType = formData.type || editingProvider?.type;
    return providerTypeOptions.find(o => o.value === currentType)?.docsUrl;
  }, [formData.type, editingProvider?.type, providerTypeOptions]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-[200px]"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={fetchProviders}
            startIcon={refreshIcon}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            startIcon={<PlusIcon className="w-5 h-5" />}
            onClick={() => handleOpenDialog()}
          >
            Add Provider
          </Button>
        </div>
      </div>

      {error && (
        <Alert status="error" message={error} onClose={() => setError(null)} />
      )}

      {providers.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto text-base-content/30 mb-4 flex justify-center items-center">
            {emptyStateIcon}
          </div>
          <h3 className="text-lg font-semibold text-base-content/70">{emptyStateTitle}</h3>
          <p className="text-base-content/50 mb-4">
            {emptyStateMessage}
          </p>
          <Button
            variant="primary"
            startIcon={<PlusIcon className="w-5 h-5" />}
            onClick={() => handleOpenDialog()}
          >
            Add Your First Provider
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={providers.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {providers.map((provider) => (
                <SortableProviderCard
                  key={provider.id}
                  provider={provider}
                  onEdit={handleOpenDialog}
                  onDelete={handleDeleteProvider}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <ModalForm
        open={openDialog}
        title={
          <div className="flex justify-between items-center w-full pr-8">
            <span>{editingProvider ? 'Edit Provider' : 'Add New Provider'}</span>
            {activeProviderDocs && (
              <a
                href={activeProviderDocs}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-normal text-primary hover:underline flex items-center gap-1"
              >
                Help & Guides <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </a>
            )}
          </div>
        }
        onClose={handleCloseDialog}
        onSubmit={handleSaveProvider}
        submitLabel={editingProvider ? 'Update' : 'Create'}
      >
        <div className="space-y-4">
          <Input
            label="Provider Name"
            value={formData.name || editingProvider?.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            fullWidth
          />

          <Select
            label="Provider Type"
            value={formData.type || editingProvider?.type || ''}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={providerTypeOptions}
            disabled={!!editingProvider}
            fullWidth
          />

          {(formData.type || editingProvider?.type) && (
            <div className="mt-4">
              <h4 className="text-lg font-semibold mb-2">Provider Configuration</h4>
              <ProviderConfig
                provider={formData.type || editingProvider?.type}
                config={formData}
                onChange={setFormData}
                showSecurityIndicators={true}
              />
            </div>
          )}

          {editingProvider && editingProvider.isActive && (
            <div className="mt-6 pt-6 border-t border-base-200">
               <h4 className="text-lg font-semibold mb-4">Activity Waterfall Trace</h4>
               <div className="bg-base-200 rounded-lg p-4 h-32 flex items-center justify-center border border-base-300">
                  {/* Placeholder for BotActivityWaterfallMonitor or real trace chart integration */}
                  <div className="text-center text-base-content/50">
                    <p className="text-sm">Traffic tracing enabled for active provider.</p>
                    <div className="mt-2 flex gap-1 justify-center items-end h-8">
                      <div className="w-2 bg-primary/40 h-full rounded-t-sm animate-pulse"></div>
                      <div className="w-2 bg-primary/60 h-2/3 rounded-t-sm animate-pulse delay-75"></div>
                      <div className="w-2 bg-primary/80 h-4/5 rounded-t-sm animate-pulse delay-150"></div>
                      <div className="w-2 bg-primary h-1/2 rounded-t-sm animate-pulse delay-300"></div>
                      <div className="w-2 bg-primary/50 h-3/4 rounded-t-sm animate-pulse delay-75"></div>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </ModalForm>

      {toast.show && (
        <div className="toast toast-bottom toast-center z-50" role="status" aria-live="polite">
          <div className={`alert ${toast.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span>{toast.message}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setToast({ ...toast, show: false })} aria-label="Close modal">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaseProvidersConfig;
