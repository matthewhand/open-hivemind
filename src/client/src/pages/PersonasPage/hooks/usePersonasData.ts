import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../../services/api';
import type { Bot, Persona as BasePersona } from '../../../types/bot';
import useUrlParams from '../../../hooks/useUrlParams';

/** Re-export canonical types so existing consumers don't break */
export type { Bot };
export type ApiPersona = BasePersona;

export interface Persona extends BasePersona {
  assignedBotNames?: string[];
  assignedBotIds?: string[];
}

export const usePersonasData = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    category: { type: 'string', default: 'all' },
  });
  const searchQuery = urlParams.search;
  const setSearchQuery = (v: string) => setUrlParam('search', v);
  const selectedCategory = urlParams.category;
  const setSelectedCategory = (v: string) => setUrlParam('category', v);

  const {
    data: configResponse,
    isLoading: configLoading,
    error: configError,
    refetch: tqRefetchConfig,
  } = useQuery<any>({
    queryKey: ['config'],
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
    queryKey: ['personas'],
    queryFn: () => apiService.get<ApiPersona[]>('/api/personas'),
    staleTime: 30_000,
    gcTime: 60_000,
  });

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
    await queryClient.invalidateQueries({ queryKey: ['config'] });
    await queryClient.invalidateQueries({ queryKey: ['personas'] });
    await Promise.all([tqRefetchConfig(), tqRefetchPersonas()]);
  }, [queryClient, tqRefetchConfig, tqRefetchPersonas]);

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
  };
};
