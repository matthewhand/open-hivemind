/**
 * Branded Types for enhanced type safety across the Hivemind codebase.
 * These types prevent accidental mixing of different string-based identifiers.
 */

export type Brand<K, T> = K & { __brand: T };

export type BotId = Brand<string, 'BotId'>;
export type PersonaId = Brand<string, 'PersonaId'>;
export type ProviderId = Brand<string, 'ProviderId'>;

/**
 * Utility functions to cast strings to branded types.
 * Use these sparingly and only at boundaries where data is validated.
 */
export const asBotId = (id: string) => id as BotId;
export const asPersonaId = (id: string) => id as PersonaId;
export const asProviderId = (id: string) => id as ProviderId;
