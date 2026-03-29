/**
 * Mem4ai Configuration for Open Hivemind
 *
 * Configuration interface for the Mem4ai memory provider.
 * Mem4ai provides open-source, LLM-friendly memory management with
 * adaptive personalization and flexible metadata tagging.
 */

export interface Mem4aiConfig {
    /** Mem4ai API endpoint */
    apiUrl: string;
    /** Mem4ai API key for authentication */
    apiKey: string;
    /** Organization ID (optional) */
    organizationId?: string;
    /** Default user ID for memory operations */
    userId?: string;
    /** Default agent ID for memory operations */
    agentId?: string;
    /** LLM provider/profile id to use for embedding-driven memory operations */
    embeddingProviderId?: string;
    /** @deprecated Use embeddingProviderId instead. */
    llmProfileKey?: string;
    /** @deprecated Use embeddingProviderId instead. */
    embeddingProfileKey?: string;
    /** Maximum number of memories to retrieve per query */
    limit?: number;
    /** Whether to use adaptive personalization */
    adaptivePersonalization?: boolean;
    /** Default tags to apply to created memories */
    defaultTags?: string[];
    /** Timeout for API requests in milliseconds */
    timeout?: number;
    /** Enable debug logging */
    debug?: boolean;
}

export const DEFAULT_MEM4AI_CONFIG: Partial<Mem4aiConfig> = {
    limit: 10,
    adaptivePersonalization: true,
    timeout: 30000,
    debug: false,
};
