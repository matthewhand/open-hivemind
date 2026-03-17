/**
 * Mem4ai Memory Provider for Open Hivemind
 * 
 * Open-source, LLM-friendly memory management with adaptive personalization
 * and flexible metadata tagging.
 * 
 * @package @hivemind/memory-mem4ai
 */

import debug from 'debug';
import { Mem4aiConfig, DEFAULT_MEM4AI_CONFIG } from './mem4aiConfig';

const log = debug('hivemind:memory:mem4ai');

export interface MemoryEntry {
    id: string;
    content: string;
    metadata?: Record<string, unknown>;
    timestamp?: number;
    tags?: string[];
}

export interface SearchResult {
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, unknown>;
    timestamp?: number;
}

/**
 * Mem4ai Memory Provider implementation
 * 
 * Provides adaptive memory management with flexible metadata tagging
 * for LLM applications.
 */
export class Mem4aiProvider {
    private config: Mem4aiConfig;
    private debug: debug.Debugger;

    constructor(config: Mem4aiConfig) {
        this.config = { ...DEFAULT_MEM4AI_CONFIG, ...config };
        this.debug = log.extend(this.config.debug ? 'debug' : 'info');

        if (!this.config.apiUrl) {
            throw new Error('Mem4ai API URL is required');
        }
        if (!this.config.apiKey) {
            throw new Error('Mem4ai API key is required');
        }

        this.debug('Mem4ai provider initialized', {
            apiUrl: this.config.apiUrl,
            adaptivePersonalization: this.config.adaptivePersonalization
        });
    }

    private getEmbeddingProviderId(): string | undefined {
        return this.config.embeddingProviderId?.trim()
            || this.config.llmProfileKey?.trim()
            || this.config.embeddingProfileKey?.trim()
            || undefined;
    }

    /**
     * Add a new memory entry
     */
    async addMemory(content: string, metadata?: Record<string, unknown>): Promise<MemoryEntry> {
        this.debug('Adding memory', { contentLength: content.length, metadata });

        const embeddingProviderId = this.getEmbeddingProviderId();

        const body = {
            content,
            user_id: this.config.userId,
            agent_id: this.config.agentId,
            embedding_provider_id: embeddingProviderId,
            embedding_profile_key: embeddingProviderId,
            metadata,
            tags: this.config.defaultTags,
        };

        try {
            const response = await this.makeRequest('/memories', 'POST', body) as Record<string, unknown>;

            this.debug('Memory added successfully', { id: response.id });
            return {
                id: response.id as string,
                content: response.content as string,
                metadata: response.metadata as Record<string, unknown> | undefined,
                timestamp: response.created_at as number,
                tags: response.tags as string[],
            };
        } catch (error) {
            this.debug('Failed to add memory', error);
            throw error;
        }
    }

    /**
     * Search memories by query
     */
    async searchMemories(query: string, limit?: number): Promise<SearchResult[]> {
        this.debug('Searching memories', { query, limit });

        const params = new URLSearchParams({
            query,
            limit: String(limit || this.config.limit || 10),
        });
        const embeddingProviderId = this.getEmbeddingProviderId();

        if (this.config.userId) {
            params.append('user_id', this.config.userId);
        }
        if (this.config.agentId) {
            params.append('agent_id', this.config.agentId);
        }
        if (embeddingProviderId) {
            params.append('embedding_provider_id', embeddingProviderId);
            params.append('embedding_profile_key', embeddingProviderId);
        }

        try {
            const response = await this.makeRequest(`/memories/search?${params}`, 'GET');

<<<<<<< HEAD
<<<<<<< HEAD
            const results: SearchResult[] = (response.results as any[]).map((result: Record<string, unknown>) => ({
=======
            const results: SearchResult[] = response.results.map((result: Record<string, unknown>) => ({
>>>>>>> origin/jules-responsive-layout-consistency-5760872167389438897
=======
            const results: SearchResult[] = response.results.map((result: Record<string, unknown>) => ({
>>>>>>> origin/refiner-database-migration-reversibility-3845862468620237629
                id: result.id as string,
                content: result.content as string,
                score: result.score as number,
                metadata: result.metadata as Record<string, unknown> | undefined,
                timestamp: result.created_at as number | undefined,
            }));

            this.debug('Search completed', { resultsCount: results.length });
            return results;
        } catch (error) {
            this.debug('Search failed', error);
            throw error;
        }
    }

    /**
     * Get all memories
     */
    async getMemories(limit?: number): Promise<MemoryEntry[]> {
        this.debug('Getting memories', { limit });

        const params = new URLSearchParams({
            limit: String(limit || this.config.limit || 10),
        });

        try {
            const response = await this.makeRequest(`/memories?${params}`, 'GET');

<<<<<<< HEAD
<<<<<<< HEAD
            const memories: MemoryEntry[] = (response.memories as any[]).map((mem: Record<string, unknown>) => ({
=======
            const memories: MemoryEntry[] = response.memories.map((mem: Record<string, unknown>) => ({
>>>>>>> origin/jules-responsive-layout-consistency-5760872167389438897
=======
            const memories: MemoryEntry[] = response.memories.map((mem: Record<string, unknown>) => ({
>>>>>>> origin/refiner-database-migration-reversibility-3845862468620237629
                id: mem.id as string,
                content: mem.content as string,
                metadata: mem.metadata as Record<string, unknown> | undefined,
                timestamp: mem.created_at as number | undefined,
                tags: mem.tags as string[] | undefined,
            }));

            this.debug('Retrieved memories', { count: memories.length });
            return memories;
        } catch (error) {
            this.debug('Failed to get memories', error);
            throw error;
        }
    }

    /**
     * Delete a memory entry
     */
    async deleteMemory(id: string): Promise<boolean> {
        this.debug('Deleting memory', { id });

        try {
            await this.makeRequest(`/memories/${id}`, 'DELETE');
            this.debug('Memory deleted', { id });
            return true;
        } catch (error) {
            this.debug('Failed to delete memory', error);
            throw error;
        }
    }

    /**
     * Update a memory entry
     */
    async updateMemory(id: string, content: string, metadata?: Record<string, unknown>): Promise<MemoryEntry> {
        this.debug('Updating memory', { id, contentLength: content.length });

        const body = {
            content,
            metadata,
        };

        try {
            const response = await this.makeRequest(`/memories/${id}`, 'PUT', body);

            this.debug('Memory updated', { id });
            return {
<<<<<<< HEAD
<<<<<<< HEAD
                id: response.id as string,
                content: response.content as string,
                metadata: response.metadata as Record<string, unknown>,
                timestamp: response.updated_at as number,
                tags: response.tags as string[],
=======
=======
>>>>>>> origin/refiner-database-migration-reversibility-3845862468620237629
                id: response.id,
                content: response.content,
                metadata: response.metadata,
                timestamp: response.updated_at,
                tags: response.tags,
<<<<<<< HEAD
>>>>>>> origin/jules-responsive-layout-consistency-5760872167389438897
=======
>>>>>>> origin/refiner-database-migration-reversibility-3845862468620237629
            };
        } catch (error) {
            this.debug('Failed to update memory', error);
            throw error;
        }
    }

    /**
     * Check provider health
     */
    async healthCheck(): Promise<boolean> {
        try {
            await this.makeRequest('/health', 'GET');
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Make API request to Mem4ai
     */
    private async makeRequest(endpoint: string, method: string, body?: Record<string, unknown>): Promise<Record<string, unknown>> {
        const url = `${this.config.apiUrl}${endpoint}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
        };

        if (this.config.organizationId) {
            headers['X-Organization-ID'] = this.config.organizationId;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeout || 30000);

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Mem4ai API error: ${response.status} - ${error}`);
            }

            return await response.json() as Promise<unknown>;
        } finally {
            clearTimeout(timeout);
        }
    }
}

export default Mem4aiProvider;

export function create(config: Mem4aiConfig): Mem4aiProvider {
    return new Mem4aiProvider(config);
}

export const manifest = {
    displayName: 'Mem4ai',
    description: 'LLM-friendly memory management with adaptive personalization and flexible metadata tagging',
    type: 'memory',
    minVersion: '1.0.0',
};
