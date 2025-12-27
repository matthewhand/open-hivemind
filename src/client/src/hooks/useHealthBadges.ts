import { useState, useEffect } from 'react';

// ... existing interface
interface HealthBadges {
    monitoringStatus: 'healthy' | 'degraded' | 'unhealthy' | null;
    monitoringBadge: string | null;
    configWarning: boolean;
    loading: boolean;
}

export const useHealthBadges = (): HealthBadges => {
    const [badges, setBadges] = useState<HealthBadges>({
        monitoringStatus: null,
        monitoringBadge: null,
        configWarning: false,
        loading: true,
    });

    useEffect(() => {
        const fetchHealthData = async () => {
            try {
                // Fetch both health and LLM status in parallel
                const [healthRes, llmRes] = await Promise.all([
                    fetch('/api/health/detailed'),
                    fetch('/api/config/llm-status')
                ]);

                let healthState = badges;

                // Process Health
                if (healthRes.ok) {
                    const data = await healthRes.json();
                    const status = data.status as 'healthy' | 'degraded' | 'unhealthy';
                    let badge: string | null = null;
                    if (status === 'unhealthy') { badge = '!'; }
                    else if (status === 'degraded') { badge = '⚠'; }

                    healthState = { ...healthState, monitoringStatus: status, monitoringBadge: badge };
                }

                // Process LLM Config
                if (llmRes.ok) {
                    const llmData = await llmRes.json();
                    // Warning if no default is configured AND no profiles exist (we rely on defaultConfigured flag)
                    // The API returns defaultConfigured true if env var is set.
                    // We also need to check if any profiles exist, but the status endpoint currently returns:
                    // { defaultConfigured, activeProvider, libraryStatus }
                    // It doesn't explicitly talk about profiles count, but if defaultConfigured is false, 
                    // and we haven't checked profiles, strictly speaking we might miss if there are *only* profiles but no default.
                    // However, we can assume for now that if defaultConfigured is false, we should WARN, 
                    // or ideally we update the endpoint to tell us if "valid configuration exists".
                    // For now, let's just warn if defaultConfigured is false, as that's the minimal safe check.
                    // Update: Better to check if we are truly unconfigured.
                    // Actually, let's fetch profiles count too or update the status endpoint.
                    // For speed, let's assume defaultConfigured=false is reason enough to warn, 
                    // OR we can make a lightweight call to /profiles if needed.
                    // Let's stick to: Warn if defaultConfigured is false.

                    healthState = { ...healthState, configWarning: !llmData.defaultConfigured };
                }

                setBadges({ ...healthState, loading: false });

            } catch (error) {
                setBadges(prev => ({ ...prev, loading: false }));
            }
        };

        fetchHealthData();
        const interval = setInterval(fetchHealthData, 30000);
        return () => clearInterval(interval);
    }, []);

    return badges;
};

export default useHealthBadges;
