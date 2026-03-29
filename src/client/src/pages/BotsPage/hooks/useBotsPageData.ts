import { useCallback, useEffect } from 'react';
import { usePageLifecycle } from '../../../hooks/usePageLifecycle';
import { apiService } from '../../../services/api';

export const useBotsPageData = (setError: (err: string | null) => void) => {
  const fetchPageData = useCallback(async (_signal: AbortSignal) => {
    const [globalResult, personasResult, profilesResult] = await Promise.allSettled([
      apiService.getGlobalConfig(),
      apiService.getPersonas(),
      apiService.getLlmProfiles(),
    ]);

    const globalData = globalResult.status === 'fulfilled' ? globalResult.value : {};
    const personasData = personasResult.status === 'fulfilled' ? personasResult.value : [];
    const profilesData = profilesResult.status === 'fulfilled' ? profilesResult.value : {};

    const personas = personasData || [];
    const llmProfiles = profilesData?.llm || profilesData?.profiles?.llm || [];

    const globalConfig: any = {};
    if (globalData) {
      Object.keys(globalData).forEach((key) => {
        globalConfig[key] = globalData[key].values;
      });
    }

    return {
      personas,
      llmProfiles,
      globalConfig,
    };
  }, []);

  const {
    data,
    loading: configLoading,
    error: lifecycleError,
    refetch,
  } = usePageLifecycle({
    title: 'Bot Management',
    fetchData: fetchPageData,
    initialData: { personas: [], llmProfiles: [], globalConfig: {} },
  });

  useEffect(() => {
    if (lifecycleError) {
      setError(lifecycleError.message);
    }
  }, [lifecycleError, setError]);

  return {
    personas: data?.personas || [],
    llmProfiles: data?.llmProfiles || [],
    globalConfig: data?.globalConfig || {},
    configLoading,
    refetch,
  };
};
