import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../../../services/api';

export interface Tool {
  name: string;
  description: string;
  inputSchema?: any;
}

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  status: 'running' | 'stopped' | 'error';
  description?: string;
  toolCount: number;
  lastConnected?: string;
  error?: string;
  tools?: Tool[];
  apiKey?: string;
}

interface TrustedRepository {
  owner: string;
  repo: string;
  name: string;
  description: string;
  url: string;
  stars: number;
}

export const useMCPServerData = (): {
  servers: MCPServer[];
  setServers: React.Dispatch<React.SetStateAction<MCPServer[]>>;
  loading: boolean;
  error: string | null;
  trustedRepositories: TrustedRepository[];
  cautionRepositories: TrustedRepository[];
  showTrustIndicator: boolean;
  fetchServers: () => Promise<void>;
} => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trustedRepositories, setTrustedRepositories] = useState<TrustedRepository[]>([]);
  const [cautionRepositories, setCautionRepositories] = useState<TrustedRepository[]>([]);
  const [showTrustIndicator, setShowTrustIndicator] = useState(true);

  const fetchServers = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.get<any>('/api/admin/mcp-servers');

      const connectedServers: MCPServer[] = (Array.isArray(data.data?.servers) ? data.data.servers : []).map(
        (server: any, index: number) => ({
          id: server.name || `server-${index}`,
          name: server.name || 'Unknown',
          url: server.serverUrl || server.url || '',
          status: server.connected ? 'running' : 'stopped',
          description: server.description || '',
          toolCount: server.tools?.length || 0,
          lastConnected: server.lastConnected,
          tools: server.tools || [],
        })
      );

      // Performance optimization: use Set for O(1) lookups instead of O(N) array search inside loop
      const connectedServerNames = new Set(connectedServers.map(s => s.name));

      const storedConfigs: MCPServer[] = (Array.isArray(data.data?.configurations) ? data.data.configurations : [])
        .map((config: any, index: number) => {
          if (connectedServerNames.has(config.name)) return null;
          return {
            id: config.name || `config-${index}`,
            name: config.name || 'Unknown',
            url: config.serverUrl || '',
            status: 'stopped' as const,
            description: '',
            toolCount: 0,
          };
        })
        .filter(Boolean);

      setServers([...connectedServers, ...storedConfigs]);
      setTrustedRepositories(
        Array.isArray(data.data?.trustedRepositories) ? data.data.trustedRepositories : []
      );
      setCautionRepositories(
        Array.isArray(data.data?.cautionRepositories) ? data.data.cautionRepositories : []
      );
      setShowTrustIndicator(data.data?.trustSettings?.showTrustIndicator !== false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch servers');
      setServers([]);
      setTrustedRepositories([]);
      setCautionRepositories([]);
      setShowTrustIndicator(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  return {
    servers,
    setServers,
    loading,
    error,
    trustedRepositories,
    cautionRepositories,
    showTrustIndicator,
    fetchServers,
  };
};
