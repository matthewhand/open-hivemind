/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

// ... existing interface
interface HealthBadges {
    monitoringStatus: 'healthy' | 'degraded' | 'unhealthy' | null;
    monitoringBadge: string | null;
    configWarning: boolean;
    loading: boolean;
}

export const useHealthBadges = (): HealthBadges => {
    const {
        data: healthData,
        isLoading: healthLoading,
    } = useQuery<any>({
        queryKey: ['health', 'detailed'],
        queryFn: () => apiService.get<any>('/api/health/detailed'),
        refetchInterval: 30_000,
    });

    const {
        data: llmData,
        isLoading: llmLoading,
    } = useQuery<any>({
        queryKey: ['config', 'llm-status'],
        queryFn: () => apiService.get<any>('/api/config/llm-status'),
        refetchInterval: 30_000,
    });

    const loading = healthLoading || llmLoading;

    let monitoringStatus: HealthBadges['monitoringStatus'] = null;
    let monitoringBadge: string | null = null;

    if (healthData) {
        const status = healthData.status as 'healthy' | 'degraded' | 'unhealthy';
        monitoringStatus = status;
        if (status === 'unhealthy') { monitoringBadge = '!'; }
        else if (status === 'degraded') { monitoringBadge = '⚠'; }
    }

    const configWarning = llmData ? !llmData.defaultConfigured : false;

    return {
        monitoringStatus,
        monitoringBadge,
        configWarning,
        loading,
    };
};

export default useHealthBadges;
