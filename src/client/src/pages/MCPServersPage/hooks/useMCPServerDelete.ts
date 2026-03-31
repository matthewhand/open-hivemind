import { useState } from 'react';
import { apiService } from '../../../services/api';

export const useMCPServerDelete = (
  bulk: any,
  fetchServers: () => Promise<void>,
  setAlert: React.Dispatch<
    React.SetStateAction<{ type: 'success' | 'error'; message: string } | null>
  >,
  setConfirmModal: React.Dispatch<
    React.SetStateAction<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>
  >
) => {
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleBulkDeleteServers = async () => {
    if (bulk.selectedCount === 0) return;
    setBulkDeleting(true);
    try {
      await Promise.allSettled(
        Array.from(bulk.selectedIds).map((id) =>
          apiService.delete(`/api/admin/mcp-servers/${encodeURIComponent(String(id))}`)
        )
      );
      bulk.clearSelection();
      setAlert({ type: 'success', message: 'Selected servers deleted' });
      await fetchServers();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to delete some servers' });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Server',
      message:
        'Are you sure you want to delete this server configuration? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await apiService.delete(`/api/admin/mcp-servers/${encodeURIComponent(serverId)}`);
          setAlert({ type: 'success', message: 'Server deleted successfully' });
          await fetchServers();
        } catch (err) {
          setAlert({
            type: 'error',
            message: err instanceof Error ? err.message : 'Failed to delete server',
          });
        }
      },
    });
  };

  return { handleBulkDeleteServers, handleDeleteServer, bulkDeleting };
};
