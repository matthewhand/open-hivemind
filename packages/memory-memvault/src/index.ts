/**
 * MemVault Memory Provider for Open Hivemind
 *
 * Open-source RAG memory server built natively in Node.js with Postgres + pgvector;
 * uses hybrid scoring (vector similarity × 0.8) + (recency decay × 0.2).
 *
 * @package @hivemind/memory-memvault
 * @version 1.0.0
 */

export * from './memVaultProvider';
export * from './memVaultConfig';
