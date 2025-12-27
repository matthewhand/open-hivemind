import { useState, useEffect } from 'react';

interface HealthBadges {
    monitoringStatus: 'healthy' | 'degraded' | 'unhealthy' | null;
    monitoringBadge: string | null;
    loading: boolean;
}

/**
 * Hook that fetches health data and provides badge counts for navigation items.
 * Updates every 30 seconds if component is mounted.
 */
export const useHealthBadges = (): HealthBadges => {
    const [badges, setBadges] = useState<HealthBadges>({
        monitoringStatus: null,
        monitoringBadge: null,
        loading: true,
    });

    useEffect(() => {
        const fetchHealthData = async () => {
            try {
                const response = await fetch('/api/health/detailed');
                if (response.ok) {
                    const data = await response.json();
                    // Use status to determine badge
                    const status = data.status as 'healthy' | 'degraded' | 'unhealthy';
                    let badge: string | null = null;

                    if (status === 'unhealthy') {
                        badge = '!';
                    } else if (status === 'degraded') {
                        badge = '⚠';
                    }

                    setBadges({
                        monitoringStatus: status,
                        monitoringBadge: badge,
                        loading: false,
                    });
                } else {
                    setBadges(prev => ({ ...prev, loading: false }));
                }
            } catch (error) {
                setBadges(prev => ({ ...prev, loading: false }));
            }
        };

        // Initial fetch
        fetchHealthData();

        // Poll every 30 seconds
        const interval = setInterval(fetchHealthData, 30000);
        return () => clearInterval(interval);
    }, []);

    return badges;
};

export default useHealthBadges;
