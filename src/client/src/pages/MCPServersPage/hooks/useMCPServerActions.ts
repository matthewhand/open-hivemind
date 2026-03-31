import { useState } from 'react';
import { type MCPServer } from './useMCPServerData';

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
      let response;
      if (action === 'stop') {
        response = await fetch('/api/admin/mcp-servers/disconnect', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ name: serverId }),
        });
      } else {
        const server = servers.find((s) => s.id === serverId);
        if (!server) throw new Error('Server not found');
        response = await fetch('/api/admin/mcp-servers/connect', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ name: server.name, serverUrl: server.url }),
        });
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `Failed to ${action} server`);
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
      const response = await fetch('/api/admin/mcp-servers/test', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: selectedServer.name || 'Test Server',
          serverUrl: selectedServer.url,
          apiKey: selectedServer.apiKey,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Connection failed');
      }

      const data = await response.json();
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
        await fetch('/api/admin/mcp-servers/disconnect', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ name: selectedServer.id }),
        });
      }

      const response = await fetch('/api/admin/mcp-servers/connect', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: selectedServer.name,
          serverUrl: selectedServer.url,
          apiKey: selectedServer.apiKey,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to connect to server');
      }

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
