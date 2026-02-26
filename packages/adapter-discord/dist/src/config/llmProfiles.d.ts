export interface ProviderProfile {
    key: string;
    name: string;
    description?: string;
    provider: string;
    config: Record<string, unknown>;
}
export interface LlmProfiles {
    llm: ProviderProfile[];
}
export declare const loadLlmProfiles: () => LlmProfiles;
export declare const saveLlmProfiles: (profiles: LlmProfiles) => void;
export declare const getLlmProfileByKey: (key: string) => ProviderProfile | undefined;
export declare const getLlmProfiles: () => LlmProfiles;
//# sourceMappingURL=llmProfiles.d.ts.map