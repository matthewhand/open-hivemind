import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../../services/api';
import { ErrorService } from '../../../services/ErrorService';
import type { BotConfig } from '../../../types/bot';

export const useBotsList = (
  setError: (err: string | null) => void,
  toastError: (msg: string) => void
) => {
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [botsLoading, setBotsLoading] = useState(true);
  const queryClient = useQueryClient();

  const {
    data: botsResponse,
    isLoading: botsQueryLoading,
    error: botsQueryError,
    refetch: tqRefetchBots,
  } = useQuery<any>({
    queryKey: ['bots'],
    queryFn: () => apiService.get('/api/bots'),
    staleTime: 30_000,
    gcTime: 60_000,
  });

  useEffect(() => {
    if (botsResponse) {
      setBots(botsResponse.data?.bots || []);
    }
  }, [botsResponse]);

  useEffect(() => {
    setBotsLoading(botsQueryLoading);
  }, [botsQueryLoading]);

  useEffect(() => {
    if (botsQueryError) {
      ErrorService.report(botsQueryError, { action: 'fetchBots' });
      setError(botsQueryError.message);
      toastError('Failed to load bots');
    } else {
      setError(null);
    }
  }, [botsQueryError, setError, toastError]);

  const fetchBots = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['bots'] });
    await tqRefetchBots();
  }, [queryClient, tqRefetchBots]);

  return { bots, setBots, botsLoading, fetchBots };
};
