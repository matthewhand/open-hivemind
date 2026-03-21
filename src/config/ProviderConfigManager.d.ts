export interface ProviderInstance {
    id: string;
    type: string;
    category: 'message' | 'llm';
    name: string;
    enabled: boolean;
    config: Record<string, any>;
}
export interface ProviderStore {
    message: ProviderInstance[];
    llm: ProviderInstance[];
}
declare class ProviderConfigManager {
    private static instance;
    private configPath;
    private store;
    private initialized;
    private constructor();
    static getInstance(): ProviderConfigManager;
    /**
     * Interpolate ${ENV_VAR} patterns in config values with actual environment variables
     */
    private interpolateEnvVars;
    private loadConfig;
    private saveConfig;
    /**
     * One-time migration from environment variables/legacy configs to instances
     */
    private migrateLegacyConfigs;
    getAllProviders(category?: 'message' | 'llm'): ProviderInstance[];
    getProvider(id: string): ProviderInstance | undefined;
    createProvider(data: Omit<ProviderInstance, 'id'>): ProviderInstance;
    updateProvider(id: string, updates: Partial<ProviderInstance>): ProviderInstance | null;
    deleteProvider(id: string): boolean;
}
export default ProviderConfigManager;
//# sourceMappingURL=ProviderConfigManager.d.ts.map