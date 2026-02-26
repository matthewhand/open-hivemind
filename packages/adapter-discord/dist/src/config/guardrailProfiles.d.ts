export interface GuardrailProfile {
    key: string;
    name: string;
    description?: string;
    mcpGuard: {
        enabled: boolean;
        type: 'owner' | 'custom';
        allowedUserIds?: string[];
    };
}
export declare const loadGuardrailProfiles: () => GuardrailProfile[];
export declare const saveGuardrailProfiles: (profiles: GuardrailProfile[]) => void;
export declare const getGuardrailProfileByKey: (key: string) => GuardrailProfile | undefined;
export declare const getGuardrailProfiles: () => GuardrailProfile[];
//# sourceMappingURL=guardrailProfiles.d.ts.map