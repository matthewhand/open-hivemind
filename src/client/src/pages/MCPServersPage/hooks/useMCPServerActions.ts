import { useState } from 'react';
import { apiService } from '../../../services/api';
import { type MCPServer } from './useMCPServerData';

export const useMCPServerActions = (
  servers: MCPServer[],
  setServers: React.Dispatch<React.SetStateAction<MCPServer[]>>,
  fetchServers: () => Promise<void>,
  setAlert: React.Dispatch<
    React.SetStateAction<{ type: 'success' | 'error'; message: string } | null>
  >
) => {
  const handleServerAction = async (serverId: string, action: 'start' | 'stop' | 'restart') => {
    if (action === 'restart') {
      await handleServerAction(serverId, 'stop');
      await handleServerAction(serverId, 'start');
      return;
    }

    try {
      let data;
      if (action === 'stop') {
        data = await apiService.post('/api/admin/mcp-servers/disconnect', { name: serverId });
      } else {
        const server = servers.find((s) => s.id === serverId);
        if (!server) throw new Error('Server not found');
        data = await apiService.post('/api/admin/mcp-servers/connect', { name: server.name, serverUrl: server.url });
      }

      setAlert({ type: 'success', message: `Server ${action} action completed` });
      setServers((prev) =>
        prev.map((s) =>
          s.id === serverId
            ? { ...s, status: action === 'start' ? 'running' : 'stopped', error: undefined }
            : s
        )
      );
      await fetchServers();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : `Failed to ${action} server`;
      setAlert({ type: 'error', message: errorMsg });
      setServers((prev) =>
        prev.map((s) => (s.id === serverId ? { ...s, status: 'error', error: errorMsg } : s))
      );
    }
  };

  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async (selectedServer: MCPServer | null) => {
    if (!selectedServer?.url) {
      setAlert({ type: 'error', message: 'Server URL is required' });
      return;
    }

    try {
      setIsTesting(true);
      const data: any = await apiService.post('/api/admin/mcp-servers/test', {
        name: selectedServer.name || 'Test Server',
        serverUrl: selectedServer.url,
        apiKey: selectedServer.apiKey,
      });

      const toolCount = data.data?.toolCount || 0;
      const tools = data.data?.tools || [];

      const toolNames = tools
        .slice(0, 5)
        .map((t: any) => t.name)
        .join(', ');
      const moreText = tools.length > 5 ? ` and ${tools.length - 5} more` : '';
      setAlert({
        type: 'success',
        message: `Connection successful! Found ${toolCount} tools: ${toolNames}${moreText}`,
      });
    } catch (err) {
      setAlert({
        type: 'error',
        message: err instanceof Error ? err.message : 'Connection failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveServer = async (
    selectedServer: MCPServer | null,
    isEditing: boolean,
    setDialogOpen: (open: boolean) => void
  ) => {
    if (!selectedServer) return;
    if (!selectedServer.name?.trim()) {
      setAlert({ type: 'error', message: 'Server name is required' });
      return;
    }
    if (!selectedServer.url?.trim()) {
      setAlert({ type: 'error', message: 'Server URL is required' });
      return;
    }

    try {
      if (isEditing) {
        await apiService.post('/api/admin/mcp-servers/disconnect', { name: selectedServer.id });
      }

      await apiService.post('/api/admin/mcp-servers/connect', {
        name: selectedServer.name,
        serverUrl: selectedServer.url,
        apiKey: selectedServer.apiKey,
      });

      setAlert({
        type: 'success',
        message: isEditing ? 'Server updated successfully' : 'Server added successfully',
      });
      setDialogOpen(false);
      await fetchServers();
    } catch (err) {
      setAlert({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save server',
      });
    }
  };

  return { handleServerAction, handleTestConnection, isTesting, handleSaveServer };
};
