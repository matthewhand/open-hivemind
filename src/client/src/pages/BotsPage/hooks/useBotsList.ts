import { useCallback, useEffect, useState } from 'react';
import { useApiQuery } from '../../../hooks/useApiQuery';
import { ErrorService } from '../../../services/ErrorService';
import type { BotConfig } from '../../../types/bot';

export const useBotsList = (
  setError: (err: string | null) => void,
  toastError: (msg: string) => void
) => {
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [botsLoading, setBotsLoading] = useState(true);

  const {
    data: botsResponse,
    loading: botsQueryLoading,
    error: botsQueryError,
    refetch: refetchBots,
  } = useApiQuery<any>('/api/bots', { ttl: 30_000 });

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
    await refetchBots();
  }, [refetchBots]);

  return { bots, setBots, botsLoading, fetchBots };
};
