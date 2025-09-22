import { useState, useEffect } from 'react';
import { getAgents, Agent } from '../services/agentService';

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const agentData = await getAgents();
        setAgents(agentData);
            } catch {
        setError('Failed to fetch agents');
      }
      setLoading(false);
    };

    fetchAgents();
  }, []);

  return { agents, loading, error };
};
