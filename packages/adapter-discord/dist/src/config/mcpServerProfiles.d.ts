export interface McpServerConfig {
    name: string;
    serverUrl: string;
    apiKey?: string;
}
export interface McpServerProfile {
    key: string;
    name: string;
    description?: string;
    mcpServers: McpServerConfig[];
}
export declare function getMcpServerProfiles(): McpServerProfile[];
export declare function getMcpServerProfileByKey(key: string): McpServerProfile | undefined;
export declare function createMcpServerProfile(profile: McpServerProfile): McpServerProfile;
export declare function updateMcpServerProfile(key: string, updates: Partial<McpServerProfile>): McpServerProfile | null;
export declare function deleteMcpServerProfile(key: string): boolean;
export declare function reloadMcpServerProfiles(): void;
//# sourceMappingURL=mcpServerProfiles.d.ts.map