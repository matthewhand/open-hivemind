import { useState } from 'react';
import { apiService } from '../../../services/api';

const getAuthHeaders = (): Record<string, string> => {
  const tokensStr = localStorage.getItem('auth_tokens');
  if (!tokensStr) return {};
  try {
    const tokens = JSON.parse(tokensStr);
    return { Authorization: `Bearer ${tokens.accessToken}` };
  } catch (err) {
    return {};
  }
};

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
          fetch(`/api/admin/mcp-servers/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          })
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
          const response = await fetch(`/api/admin/mcp-servers/${encodeURIComponent(serverId)}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          if (!response.ok)
            throw new Error((await response.json()).message || 'Failed to delete server');
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
