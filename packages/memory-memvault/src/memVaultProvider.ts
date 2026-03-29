/**
 * MemVault Memory Provider for Open Hivemind
 *
 * Open-source RAG memory server built natively in Node.js with Postgres + pgvector;
 * uses hybrid scoring (vector similarity × 0.8) + (recency decay × 0.2).
 *
 * @package @hivemind/memory-memvault
 */

import debug from 'debug';
import { Pool } from 'pg';
import { MemVaultConfig, DEFAULT_MEMVAULT_CONFIG } from './memVaultConfig';

const log = debug('hivemind:memory:memvault');

export interface MemoryEntry {
    id: string;
    content: string;
    metadata?: Record<string, unknown>;
    timestamp?: number;
    userId?: string;
}

export interface SearchResult {
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, unknown>;
    timestamp?: number;
}

/**
 * MemVault Memory Provider implementation
 *
 * Provides RAG memory with hybrid scoring using vector similarity and recency decay.
 */
export class MemVaultProvider {
    private config: MemVaultConfig;
    private debug: debug.Debugger;
    private pool: Pool | null = null;

    constructor(config: MemVaultConfig) {
        this.config = { ...DEFAULT_MEMVAULT_CONFIG, ...config };
        this.debug = log.extend(this.config.debug ? 'debug' : 'info');

        if (!this.config.host) {
            throw new Error('MemVault PostgreSQL host is required');
        }
        if (!this.config.database) {
            throw new Error('MemVault PostgreSQL database is required');
        }
        if (!this.config.user) {
            throw new Error('MemVault PostgreSQL user is required');
        }

        this.debug('MemVault provider initialized', {
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            vectorDimension: this.config.vectorDimension,
            hybridScoring: {
                vectorWeight: this.config.vectorWeight,
                recencyWeight: this.config.recencyWeight,
            },
        });
    }

    private getLlmProfileKey(): string | undefined {
        return this.config.llmProfileKey?.trim() || this.config.embeddingProfileKey?.trim() || undefined;
    }

    /**
     * Initialize the database connection and create tables
     */
    async initialize(): Promise<void> {
        this.debug('Initializing MemVault database connection');

        this.pool = new Pool({
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.user,
            password: this.config.password,
            max: this.config.max,
            idleTimeoutMillis: this.config.idleTimeoutMillis,
            connectionTimeoutMillis: this.config.connectionTimeoutMillis,
        });

        await this.ensureDatabaseExtensions();

        // Create the memory table with pgvector
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS memories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                content TEXT NOT NULL,
                embedding vector(${this.config.vectorDimension || 1536}),
                metadata JSONB DEFAULT '{}',
                user_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Create index for vector similarity search
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS memories_embedding_idx
            ON memories
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
        `);

        // Create index for user_id and timestamps
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS memories_user_id_idx ON memories(user_id);
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS memories_created_at_idx ON memories(created_at DESC);
        `);

        this.debug('MemVault database initialized successfully');
    }

    private async ensureDatabaseExtensions(): Promise<void> {
        if (!this.pool) {
            throw new Error('MemVault provider not initialized. Call initialize() first.');
        }

        try {
            await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector');
            await this.pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown database error';
            throw new Error(
                `MemVault requires PostgreSQL extensions "vector" and "pgcrypto". ` +
                `Install them or grant the database user permission to create extensions. Original error: ${message}`
            );
        }
    }

    /**
     * Generate embedding for text content
     */
    private async generateEmbedding(content: string): Promise<number[]> {
        const llmProfileKey = this.getLlmProfileKey();

        if (this.config.embeddingResolver && llmProfileKey) {
            return this.config.embeddingResolver(content, llmProfileKey);
        }

        if (!this.config.embeddingEndpoint) {
            throw new Error('LLM profile key + embedding resolver or embedding endpoint is required for vector generation');
        }

        const response = await fetch(this.config.embeddingEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.config.embeddingApiKey && { 'Authorization': `Bearer ${this.config.embeddingApiKey}` }),
            },
            body: JSON.stringify({
                model: this.config.embeddingModel || 'text-embedding-ada-002',
                input: content,
            }),
        });

        if (!response.ok) {
            throw new Error(`Embedding API error: ${response.status}`);
        }

        const data = await response.json();
        return data.data[0].embedding;
    }

    /**
     * Add a new memory entry
     */
    async addMemory(content: string, metadata?: Record<string, unknown>, userId?: string): Promise<MemoryEntry> {
        this.debug('Adding memory', { contentLength: content.length, metadata, userId });

        if (!this.pool) {
            throw new Error('MemVault provider not initialized. Call initialize() first.');
        }

        const embedding = await this.generateEmbedding(content);
        const embeddingStr = `[${embedding.join(',')}]`;

        const result = await this.pool.query(
            `INSERT INTO memories (content, embedding, metadata, user_id)
             VALUES ($1, $2, $3, $4)
             RETURNING id, content, metadata, created_at, user_id`,
            [content, embeddingStr, JSON.stringify(metadata || {}), userId || null]
        );

        const row = result.rows[0];
        this.debug('Memory added successfully', { id: row.id });

        return {
            id: row.id,
            content: row.content,
            metadata: row.metadata,
            timestamp: row.created_at.getTime(),
            userId: row.user_id,
        };
    }

    /**
     * Search memories using hybrid scoring
     */
    async searchMemories(query: string, limit: number = 10, userId?: string): Promise<SearchResult[]> {
        this.debug('Searching memories', { query, limit, userId });

        if (!this.pool) {
            throw new Error('MemVault provider not initialized. Call initialize() first.');
        }

        const queryEmbedding = await this.generateEmbedding(query);
        const embeddingStr = `[${queryEmbedding.join(',')}]`;

        // Hybrid scoring: (vector_similarity * vectorWeight) + (recency_decay * recencyWeight)
        const vectorWeight = this.config.vectorWeight || 0.8;
        const recencyWeight = this.config.recencyWeight || 0.2;
        const dayInMs = 24 * 60 * 60 * 1000;

        let sql = `
            SELECT
                id,
                content,
                metadata,
                created_at,
                user_id,
                (1 - (embedding <=> $1)) * ${vectorWeight} +
                GREATEST(0, 1 - (EXTRACT(EPOCH FROM (NOW() - created_at)) * 1000 / ${dayInMs}) / 30) * ${recencyWeight} as score
            FROM memories
            WHERE 1=1
        `;

        const params: (string | number)[] = [embeddingStr];
        let paramIndex = 2;

        if (userId) {
            sql += ` AND user_id = $${paramIndex}`;
            params.push(userId);
            paramIndex++;
        }

        sql += ` ORDER BY score DESC LIMIT $${paramIndex}`;
        params.push(limit);

        const result = await this.pool.query(sql, params);

        const results: SearchResult[] = result.rows.map((row) => ({
            id: row.id,
            content: row.content,
            score: row.score,
            metadata: row.metadata,
            timestamp: row.created_at.getTime(),
        }));

        this.debug('Search completed', { resultsCount: results.length });
        return results;
    }

    /**
     * Get all memories for a user
     */
    async getMemories(limit: number = 100, userId?: string): Promise<MemoryEntry[]> {
        this.debug('Getting memories', { limit, userId });

        if (!this.pool) {
            throw new Error('MemVault provider not initialized. Call initialize() first.');
        }

        let sql = 'SELECT id, content, metadata, created_at, user_id FROM memories';
        const params: (string | number)[] = [];
        let paramIndex = 1;

        if (userId) {
            sql += ` WHERE user_id = $${paramIndex}`;
            params.push(userId);
            paramIndex++;
        }

        sql += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
        params.push(limit);

        const result = await this.pool.query(sql, params);

        const memories: MemoryEntry[] = result.rows.map((row) => ({
            id: row.id,
            content: row.content,
            metadata: row.metadata,
            timestamp: row.created_at.getTime(),
            userId: row.user_id,
        }));

        this.debug('Retrieved memories', { count: memories.length });
        return memories;
    }

    /**
     * Delete a memory entry
     */
    async deleteMemory(id: string): Promise<boolean> {
        this.debug('Deleting memory', { id });

        if (!this.pool) {
            throw new Error('MemVault provider not initialized. Call initialize() first.');
        }

        await this.pool.query('DELETE FROM memories WHERE id = $1', [id]);
        this.debug('Memory deleted', { id });
        return true;
    }

    /**
     * Update a memory entry
     */
    async updateMemory(id: string, content: string, metadata?: Record<string, unknown>): Promise<MemoryEntry> {
        this.debug('Updating memory', { id, contentLength: content.length });

        if (!this.pool) {
            throw new Error('MemVault provider not initialized. Call initialize() first.');
        }

        const embedding = await this.generateEmbedding(content);
        const embeddingStr = `[${embedding.join(',')}]`;

        const result = await this.pool.query(
            `UPDATE memories
             SET content = $1, embedding = $2, metadata = $3, updated_at = NOW()
             WHERE id = $4
             RETURNING id, content, metadata, updated_at`,
            [content, embeddingStr, JSON.stringify(metadata || {}), id]
        );

        if (result.rows.length === 0) {
            throw new Error(`Memory not found: ${id}`);
        }

        const row = result.rows[0];
        this.debug('Memory updated', { id });

        return {
            id: row.id,
            content: row.content,
            metadata: row.metadata,
            timestamp: row.updated_at.getTime(),
        };
    }

    /**
     * Check provider health
     */
    async healthCheck(): Promise<boolean> {
        if (!this.pool) {
            return false;
        }

        try {
            await this.pool.query('SELECT 1');
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Close the database connection
     */
    async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.debug('MemVault disconnected');
        }
    }
}

export default MemVaultProvider;

// ---------------------------------------------------------------------------
// Factory and manifest
// ---------------------------------------------------------------------------

export function create(config: MemVaultConfig): MemVaultProvider {
    return new MemVaultProvider(config);
}

export const manifest = {
    displayName: 'MemVault',
    description: 'RAG memory via PostgreSQL + pgvector with hybrid vector/recency scoring',
    type: 'memory',
    minVersion: '1.0.0',
};
