import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { loadMemoryProfiles } from './config/memoryProfiles';
import { loadToolProfiles } from './config/toolProfiles';
import { SwarmInstaller } from '@integrations/openswarm/SwarmInstaller';
import {
  instantiateMemoryProvider,
  instantiateToolProvider,
  loadPlugin,
} from './plugins/PluginLoader';
import { providerRegistry } from './registries/ProviderRegistry';

const debug = Debug('app:initProviders');

export async function initProviders() {
  const providersDir = path.join(__dirname, 'providers');

  try {
    await fs.promises.access(providersDir, fs.constants.F_OK);
    const files = await fs.promises.readdir(providersDir);
    for (const file of files) {
      // Filter for .ts and .js files, excluding definition files and tests
      if (
        (file.endsWith('.ts') || file.endsWith('.js')) &&
        !file.endsWith('.d.ts') &&
        !file.endsWith('.test.ts') &&
        !file.endsWith('.spec.ts')
      ) {
        const filePath = path.join(providersDir, file);
        try {
          // Dynamic import

          const module = await import(filePath);

          // Find exported class that looks like a provider
          for (const key in module) {
            const ExportedClass = module[key];
            if (typeof ExportedClass === 'function' && ExportedClass.prototype) {
              // Instantiate to check properties
              // We assume provider classes have a no-argument constructor
              try {
                const instance = new ExportedClass();

                // Duck typing check for IProvider
                // Must have id, type, and getConfig method
                if (
                  instance.id &&
                  instance.type &&
                  typeof instance.getConfig === 'function' &&
                  typeof instance.getSchema === 'function'
                ) {
                  providerRegistry.register(instance);
                }
              } catch (e) {
                // Ignore instantiation errors (e.g. requires args, or abstract class)
              }
            }
          }
        } catch (e) {
          debug('ERROR:', `Failed to load provider from ${file}`, e);
        }
      }
    }
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      debug('WARN:', `Providers directory not found at ${providersDir}`);
    } else {
      throw err;
    }
  }

  // Discover and register memory providers from profiles
  await discoverMemoryProviders();

  // Discover and register tool providers from profiles
  await discoverToolProviders();

  // Register Tool Installers
  // These are currently manual as they reside in integrations/
  providerRegistry.registerInstaller(new SwarmInstaller());
}

/**
 * Discover memory providers by scanning:
 *  1. memory-profiles.json config entries
 *  2. packages/memory-* workspace packages
 *
 * Each profile entry has a `provider` field (e.g. 'memory-mem0') that maps to
 * a plugin package name. The PluginLoader resolves it via @hivemind/<name> or
 * the community plugins directory.
 */
async function discoverMemoryProviders(): Promise<void> {
  // 1. Load from profile config
  try {
    const profiles = loadMemoryProfiles();
    for (const profile of profiles.memory) {
      try {
        const pluginName = profile.provider.startsWith('memory-')
          ? profile.provider
          : `memory-${profile.provider}`;
        const mod = await loadPlugin(pluginName);
        const instance = instantiateMemoryProvider(mod, profile.config);
        providerRegistry.registerMemoryProvider(profile.key, instance);
        debug('Registered memory provider from profile: %s (%s)', profile.key, pluginName);
      } catch (err: any) {
        debug('Could not load memory provider for profile "%s": %s', profile.key, err.message);
      }
    }
  } catch (err: any) {
    debug('Failed to load memory profiles: %s', err.message);
  }

  // 2. Scan packages/memory-* for auto-discovery
  const packagesDir = path.join(__dirname, '..', 'packages');
  try {
    await fs.promises.access(packagesDir, fs.constants.F_OK);
    const entries = await fs.promises.readdir(packagesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('memory-')) continue;
      const pkgName = entry.name;
      // Skip if already registered via profile
      if (providerRegistry.getMemoryProvider(pkgName)) continue;
      try {
        const mod = await loadPlugin(pkgName);
        const instance = instantiateMemoryProvider(mod);
        providerRegistry.registerMemoryProvider(pkgName, instance);
        debug('Auto-discovered memory provider package: %s', pkgName);
      } catch (err: any) {
        debug('Could not auto-load memory package "%s": %s', pkgName, err.message);
      }
    }
  } catch {
    // packages directory doesn't exist — not an error
  }
}

/**
 * Discover tool providers by scanning:
 *  1. tool-profiles.json config entries
 *  2. packages/tool-* workspace packages
 */
async function discoverToolProviders(): Promise<void> {
  // 1. Load from profile config
  try {
    const profiles = loadToolProfiles();
    for (const profile of profiles.tool) {
      try {
        const pluginName = profile.provider.startsWith('tool-')
          ? profile.provider
          : `tool-${profile.provider}`;
        const mod = await loadPlugin(pluginName);
        const instance = instantiateToolProvider(mod, profile.config);
        providerRegistry.registerToolProvider(profile.key, instance);
        debug('Registered tool provider from profile: %s (%s)', profile.key, pluginName);
      } catch (err: any) {
        debug('Could not load tool provider for profile "%s": %s', profile.key, err.message);
      }
    }
  } catch (err: any) {
    debug('Failed to load tool profiles: %s', err.message);
  }

  // 2. Scan packages/tool-* for auto-discovery
  const packagesDir = path.join(__dirname, '..', 'packages');
  try {
    await fs.promises.access(packagesDir, fs.constants.F_OK);
    const entries = await fs.promises.readdir(packagesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('tool-')) continue;
      const pkgName = entry.name;
      if (providerRegistry.getToolProvider(pkgName)) continue;
      try {
        const mod = await loadPlugin(pkgName);
        const instance = instantiateToolProvider(mod);
        providerRegistry.registerToolProvider(pkgName, instance);
        debug('Auto-discovered tool provider package: %s', pkgName);
      } catch (err: any) {
        debug('Could not auto-load tool package "%s": %s', pkgName, err.message);
      }
    }
  } catch {
    // packages directory doesn't exist — not an error
  }
}
