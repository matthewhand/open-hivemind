import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../../services/api';
import useUrlParams from '../../../hooks/useUrlParams';

export interface Bot {
  id: string;
  name: string;
  persona?: string;
  envOverrides?: any;
}

export interface ApiPersona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  isBuiltIn: boolean;
  category: string;
  avatarId?: string;
}

export interface Persona extends ApiPersona {
  assignedBotNames?: string[];
  assignedBotIds?: string[];
}

export const usePersonasData = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    category: { type: 'string', default: 'all' },
  });
  const searchQuery = urlParams.search;
  const setSearchQuery = (v: string) => setUrlParam('search', v);
  const selectedCategory = urlParams.category;
  const setSelectedCategory = (v: string) => setUrlParam('category', v);

  const queryClient = useQueryClient();

  const {
    data: configResponse,
    isLoading: configLoading,
    error: configError,
    refetch: tqRefetchConfig,
  } = useQuery<any>({
    queryKey: ['apiQuery', '/api/config'],
    queryFn: () => apiService.get('/api/config'),
    staleTime: 30_000,
    gcTime: 60_000,
  });
  const {
    data: personasResponse,
    isLoading: personasLoading,
    error: personasError,
    refetch: tqRefetchPersonas,
  } = useQuery<ApiPersona[]>({
    queryKey: ['apiQuery', '/api/personas'],
    queryFn: () => apiService.get('/api/personas'),
    staleTime: 30_000,
    gcTime: 60_000,
  });

  const refetchConfig = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['apiQuery', '/api/config'] });
    await tqRefetchConfig();
  }, [queryClient, tqRefetchConfig]);

  const refetchPersonas = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['apiQuery', '/api/personas'] });
    await tqRefetchPersonas();
  }, [queryClient, tqRefetchPersonas]);

  useEffect(() => {
    const botList = Array.isArray(configResponse?.bots) ? configResponse?.bots : [];
    const filledBots = botList.map((b: any) => ({ ...b, id: b.id || b.name }));
    setBots(filledBots);

    const rawPersonas = Array.isArray(personasResponse) ? personasResponse : (personasResponse?.data || []);
    const mappedPersonas = rawPersonas.map((p) => {
      const assigned = filledBots.filter((b: any) => b.persona === p.id || b.persona === p.name);
      return {
        ...p,
        assignedBotNames: assigned.map((b: any) => b.name),
        assignedBotIds: assigned.map((b: any) => b.id),
      };
    });
    setPersonas(mappedPersonas);
  }, [configResponse, personasResponse]);

  useEffect(() => {
    setLoading(configLoading || personasLoading);
  }, [configLoading, personasLoading]);
  useEffect(() => {
    const err = configError || personasError;
    setError(err ? err.message : null);
  }, [configError, personasError]);

  const fetchData = useCallback(async () => {
    await Promise.all([refetchConfig(), refetchPersonas()]);
  }, [refetchConfig, refetchPersonas]);

  const filteredPersonas = useMemo(() => {
    return personas.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [personas, searchQuery, selectedCategory]);

  const filteredPersonaIds = useMemo(
    () => filteredPersonas.filter((p) => !p.isBuiltIn).map((p) => p.id),
    [filteredPersonas]
  );

  return {
    bots,
    personas,
    loading,
    error,
    fetchData,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    filteredPersonas,
    filteredPersonaIds,
    setPersonas,
  };
};
