import { useState, useEffect, useCallback } from 'react';
import { getAgents, Agent } from '../services/agentService';

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const agentData = await getAgents();
      setAgents(agentData);
    } catch {
      setError('Failed to fetch agents');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
};
