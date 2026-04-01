import { useQuery } from '@tanstack/react-query';
import type { Agent } from '../services/agentService';
import { getAgents } from '../services/agentService';

export const useAgents = () => {
  const {
    data: agents = [],
    isLoading: loading,
    error: queryError,
  } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: getAgents,
  });

  const error = queryError instanceof Error ? queryError.message : null;

  return { agents, loading, error };
};
