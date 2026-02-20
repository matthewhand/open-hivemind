/**
 * Dynamic Provider Registry for Messenger Service Loading
 *
 * Providers are discovered at runtime by scanning the integrations directory.
 * Convention: Each integration folder should export a service implementing IMessengerService
 * with a static getInstance() method.
 *
 * Discovery patterns:
 * - src/integrations/{name}/{Name}Service.ts (e.g., discord/DiscordService.ts)
 * - The exported class should have a static getInstance() method
 *
 * Type Guards ensure only valid IMessengerService implementations are loaded.
 */
import type { IMessengerService } from './interfaces/IMessengerService';
import Debug from 'debug';
import fs from 'fs';
import path from 'path';

const debug = Debug('app:ProviderRegistry');

// Cache of loaded providers
const loadedProviders: Map<string, IMessengerService> = new Map();

// Discovered provider metadata
const discoveredProviders: Map<string, { modulePath: string; serviceExport: string }> = new Map();

let initialized = false;

/**
 * Type guard to check if a module export is a valid IMessengerService factory.
 */
function isValidServiceFactory(obj: any): obj is { getInstance: () => IMessengerService } {
    return (
        obj &&
        typeof obj === 'function' &&
        typeof obj.getInstance === 'function'
    );
}

/**
 * Type guard to check if an instance implements IMessengerService.
 */
function isMessengerService(obj: any): obj is IMessengerService {
    return (
        obj &&
        typeof obj.initialize === 'function' &&
        typeof obj.sendMessageToChannel === 'function' &&
        typeof obj.getMessagesFromChannel === 'function' &&
        typeof obj.shutdown === 'function'
    );
}

/**
 * Discover available providers by scanning the integrations directory.
 * This is called lazily on first access.
 */
function discoverProviders(): void {
    if (initialized) return;
    initialized = true;

    const integrationsDir = path.join(__dirname, '..', 'integrations');

    if (!fs.existsSync(integrationsDir)) {
        debug('Integrations directory not found');
        return;
    }

    const entries = fs.readdirSync(integrationsDir, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const providerName = entry.name.toLowerCase();
        const pascalName = providerName.charAt(0).toUpperCase() + providerName.slice(1);
        const serviceFileName = `${pascalName}Service`;
        const providerDir = path.join(integrationsDir, entry.name);

        // Look for {Name}Service.ts or {Name}Service.js
        const possiblePaths = [
            path.join(providerDir, `${serviceFileName}.ts`),
            path.join(providerDir, `${serviceFileName}.js`),
        ];

        for (const filePath of possiblePaths) {
            if (fs.existsSync(filePath)) {
                discoveredProviders.set(providerName, {
                    modulePath: path.relative(__dirname, filePath).replace(/\.(ts|js)$/, ''),
                    serviceExport: serviceFileName,
                });
                debug(`Discovered provider: ${providerName} -> ${serviceFileName}`);
                break;
            }
        }
    }

    debug(`Provider discovery complete: ${discoveredProviders.size} providers found`);
}

/**
 * Dynamically load and get a messenger service by provider name.
 * Returns null if not found, disabled, or fails validation.
 */
export async function getMessengerServiceByProvider(providerName: string): Promise<IMessengerService | null> {
    discoverProviders();

    const normalizedName = providerName.toLowerCase();

    // Check cache first
    if (loadedProviders.has(normalizedName)) {
        return loadedProviders.get(normalizedName)!;
    }

    const providerMeta = discoveredProviders.get(normalizedName);
    if (!providerMeta) {
        debug(`Provider "${providerName}" was not discovered.`);
        return null;
    }

    try {
        debug(`Loading provider: ${providerName}`);

        // Dynamic import
        const module = await import(providerMeta.modulePath);
        const ServiceClass = module[providerMeta.serviceExport];

        // Validate factory pattern
        if (!isValidServiceFactory(ServiceClass)) {
            debug(`Provider "${providerName}" does not have a valid getInstance() factory`);
            return null;
        }

        const service = ServiceClass.getInstance();

        // Validate IMessengerService interface
        if (!isMessengerService(service)) {
            debug(`Provider "${providerName}" does not implement IMessengerService correctly`);
            return null;
        }

        loadedProviders.set(normalizedName, service);
        debug(`Successfully loaded provider: ${providerName}`);
        return service;
    } catch (error: any) {
        debug(`Failed to load provider "${providerName}": ${error.message}`);
        return null;
    }
}

/**
 * Get list of all discovered provider names.
 */
export function getRegisteredProviders(): string[] {
    discoverProviders();
    return Array.from(discoveredProviders.keys());
}

/**
 * Check if a provider is discovered.
 */
export function isProviderRegistered(providerName: string): boolean {
    discoverProviders();
    return discoveredProviders.has(providerName.toLowerCase());
}

/**
 * Get list of currently loaded (active) providers.
 */
export function getLoadedProviders(): string[] {
    return Array.from(loadedProviders.keys());
}

/**
 * Unload a provider from cache (e.g. when disabling).
 */
export function unloadProvider(providerName: string): void {
    const normalizedName = providerName.toLowerCase();
    if (loadedProviders.has(normalizedName)) {
        loadedProviders.delete(normalizedName);
        debug(`Unloaded provider: ${providerName}`);
    }
}

/**
 * Force re-discovery of providers (useful after adding new integrations).
 */
export function refreshProviders(): void {
    initialized = false;
    discoveredProviders.clear();
    discoverProviders();
}
