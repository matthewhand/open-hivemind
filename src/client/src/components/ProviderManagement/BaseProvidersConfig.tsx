/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { arrayMove } from '@dnd-kit/sortable';
import {
  ExternalLink as ArrowTopRightOnSquareIcon,
  GripVertical as Bars3Icon,
  Pencil as PencilIcon,
  Plus as PlusIcon,
  Trash2 as TrashIcon,
} from 'lucide-react';
import { Alert } from '../DaisyUI/Alert';
import Badge from '../DaisyUI/Badge';
import Button from '../DaisyUI/Button';
import Card from '../DaisyUI/Card';
import { SkeletonList } from '../DaisyUI/Skeleton';
import Modal, { ConfirmModal } from '../DaisyUI/Modal';
import Input from '../DaisyUI/Input';
import Select from '../DaisyUI/Select';
import ProviderConfig from '../ProviderConfig';
import useProviderConfig from './useProviderConfig';

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

const SortableProviderCard = React.memo<SortableProviderCardProps>(({ provider, onEdit, onDelete, onToggleActive }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: provider.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="shadow-xl border border-base-200">
        <Card.Body className="p-4 sm:p-6">
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
                <Card.Title tag="h3" className="text-lg m-0 leading-tight">{provider.name}</Card.Title>
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
                variant="secondary"
                className="btn-outline"
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
              variant="secondary"
              className="btn-outline"
              onClick={() => onToggleActive(provider.id, !provider.isActive)}
            >
              {provider.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
});

const BaseProvidersConfig: React.FC<BaseProvidersConfigProps> = ({
  apiEndpoint,
  providerTypeOptions,
  title,
  emptyStateIcon,
  emptyStateTitle,
  emptyStateMessage,
  refreshIcon,
}) => {
  const {
    providers,
    loading: providersLoading,
    error: providersError,
    toast,
    setToast,
    fetchProviders,
    handleDragEnd: hookHandleDragEnd,
    handleSaveProvider: hookHandleSaveProvider,
    handleDeleteProvider: hookHandleDeleteProvider,
    handleToggleActive: hookHandleToggleActive,
  } = useProviderConfig({ apiEndpoint });

  const [openDialog, setOpenDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderItem | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

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

  // Wrapper functions that adapt hook results to component's modal/state needs
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      await hookHandleDragEnd(event);
    },
    [hookHandleDragEnd]
  );

  const handleOpenDialog = useCallback((provider?: ProviderItem) => {
    setEditingProvider(provider || null);
    setFormData(provider?.config || {});
    setOpenDialog(true);
  }, [setEditingProvider, setFormData]);

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProvider(null);
    setFormData({});
  };

  const handleSaveProvider = async () => {
    await hookHandleSaveProvider(editingProvider, formData);
    handleCloseDialog();
  };

  const handleDeleteProvider = useCallback(async (providerId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Provider',
      message: 'Are you sure you want to delete this provider?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        await hookHandleDeleteProvider(providerId);
      },
    });
  }, [hookHandleDeleteProvider, setConfirmModal]);

  const handleToggleActive = useCallback(async (providerId: string, isActive: boolean) => {
    await hookHandleToggleActive(providerId, isActive);
  }, [hookHandleToggleActive, setConfirmModal]);

  const activeProviderDocs = useMemo(() => {
    const currentType = formData.type || editingProvider?.type;
    return providerTypeOptions.find((o) => o.value === currentType)?.docsUrl;
  }, [formData.type, editingProvider?.type, providerTypeOptions]);

  if (providersLoading) {
    return (
      <div className="min-h-[200px] p-4">
        <SkeletonList items={4} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={fetchProviders} startIcon={refreshIcon}>
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

      {providersError && <Alert status="error" message={providersError} onClose={() => setToast({ ...toast, show: false })} />}

      {providers.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto text-base-content/30 mb-4 flex justify-center items-center">
            {emptyStateIcon}
          </div>
          <h3 className="text-lg font-semibold text-base-content/70">{emptyStateTitle}</h3>
          <p className="text-base-content/50 mb-4">{emptyStateMessage}</p>
          <Button
            variant="primary"
            startIcon={<PlusIcon className="w-5 h-5" />}
            onClick={() => handleOpenDialog()}
          >
            Add Your First Provider
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={providers.map((p) => p.id)}
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

      <Modal
        isOpen={openDialog}
        title={editingProvider ? 'Edit Provider' : 'Add New Provider'}
        onClose={handleCloseDialog}
        actions={[
          { label: 'Cancel', onClick: handleCloseDialog, variant: 'ghost' },
          { label: editingProvider ? 'Update' : 'Create', onClick: handleSaveProvider, variant: 'primary' },
        ]}
      >
        <div className="space-y-4">
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

export default BaseProvidersConfig;
