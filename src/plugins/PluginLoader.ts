import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import Debug from 'debug';
import type { ILlmProvider, IMessengerService } from '@hivemind/shared-types';
import type { AnyConfig } from '../types/config';

const debug = Debug('app:pluginLoader');

/**
 * Directory where community-installed plugins live.
 * Defaults to ~/.hivemind/plugins — survives app upgrades.
 * Override with HIVEMIND_PLUGINS_DIR env var.
 */
export const PLUGINS_DIR: string =
  process.env.HIVEMIND_PLUGINS_DIR ?? path.join(os.homedir(), '.hivemind', 'plugins');

/**
 * Plugin manifest — every package must export this as `manifest`.
 * The `create(config)` factory is the single entry point for instantiation.
 */
export interface PluginManifest {
  /** Human-readable name shown in the WebUI */
  displayName: string;
  /** Short description shown in the marketplace */
  description: string;
  /** Minimum open-hivemind core version required, e.g. "1.0.0" */
  minVersion?: string;
  /** Provider type — derivable from package name prefix but explicit here for safety */
  type: 'llm' | 'message' | 'memory' | 'tool';
}

export interface PluginModule {
  manifest?: PluginManifest;
  create?: (config?: AnyConfig | any) => any;
  default?: (config?: AnyConfig | any) => any;
  [key: string]: any;
}

/**
 * Load a plugin by its full package name (e.g. 'llm-openai', 'message-discord').
 *
 * Resolution order:
 *   1. @hivemind/<name>  — built-in workspace package
 *   2. PLUGINS_DIR/<name> — community-installed plugin
 *
 * Returns the raw module object. Callers use `mod.create(config)` or
 * fall back to known class names for packages that predate the factory contract.
 */
export function loadPlugin(name: string): PluginModule {
  // 1. Try built-in workspace package
  try {
    const mod = require(`@hivemind/${name}`);
    debug('Loaded built-in plugin: @hivemind/%s', name);
    return mod;
  } catch (e: unknown) {
    if (e instanceof Error && !e.message?.includes('Cannot find module')) throw e;
  }

  // 2. Try community plugins dir
  const pluginPath = path.join(PLUGINS_DIR, name);
  if (fs.existsSync(pluginPath)) {
    try {
      // Bust require cache on reload (e.g. after update)
      const resolved = require.resolve(pluginPath);
      delete require.cache[resolved];
      const mod = require(pluginPath);
      debug('Loaded community plugin: %s', pluginPath);
      return mod;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Failed to load community plugin '${name}': ${msg}`);
    }
  }

  throw new Error(
    `Plugin '${name}' not found. ` +
      `Check that @hivemind/${name} is installed or the plugin exists in ${PLUGINS_DIR}.`
  );
}

/**
 * Instantiate an LLM provider from a loaded module.
 *
 * Contract (preferred): module exports `create(config)` → ILlmProvider
 * Fallback: known class name patterns for pre-factory packages.
 */
export function instantiateLlmProvider(mod: PluginModule, config?: AnyConfig | any): ILlmProvider {
  // Preferred: explicit factory
  if (typeof mod.create === 'function') {
    return mod.create(config);
  }
  // Fallback: singleton getInstance
  const name = Object.keys(mod).find(
    (k) => k.endsWith('Provider') && typeof mod[k]?.getInstance === 'function'
  );
  if (name && typeof mod[name].getInstance === 'function') {
    return mod[name].getInstance(config);
  }
  // Fallback: constructor
  const ctor = Object.keys(mod).find((k) => k.endsWith('Provider') && typeof mod[k] === 'function');
  if (ctor && typeof mod[ctor] === 'function') {
    return new mod[ctor](config);
  }
  // Fallback: default export
  if (typeof mod.default === 'function') {
    // Handling cases where default could be a class constructor or a factory
    try {
      return new (mod.default as any)(config);
    } catch (_e) {
      return mod.default(config);
    }
  }
  throw new Error('Plugin does not export create(), a Provider class, or a default constructor.');
}

/**
 * Instantiate a message service from a loaded module.
 *
 * Contract (preferred): module exports `create(config)` → IMessengerService
 * Fallback: known Service singleton patterns.
 */
export function instantiateMessageService(
  mod: PluginModule,
  config?: AnyConfig | any
): IMessengerService {
  // Preferred: explicit factory
  if (typeof mod.create === 'function') {
    return mod.create(config);
  }
  if (typeof mod.default === 'function') {
    return mod.default(config);
  }
  // Fallback: *Service.getInstance()
  const svcKey = Object.keys(mod).find(
    (k) => k.endsWith('Service') && typeof mod[k]?.getInstance === 'function'
  );
  if (svcKey && typeof mod[svcKey].getInstance === 'function') {
    return mod[svcKey].getInstance();
  }
  throw new Error(
    'Plugin does not export create(), a default factory, or a Service.getInstance().'
  );
}

/**
 * Instantiate a memory provider from a loaded module.
 *
 * Contract (preferred): module exports `create(config)` → IMemoryProvider
 * Fallback: known Provider class patterns.
 */
export function instantiateMemoryProvider(mod: any, config?: any): any {
  // Preferred: explicit factory
  if (typeof mod.create === 'function') {
    return mod.create(config);
  }
  // Fallback: *Provider constructor
  const ctor = Object.keys(mod).find((k) => k.endsWith('Provider') && typeof mod[k] === 'function');
  if (ctor) {
    return new mod[ctor](config);
  }
  // Fallback: default export
  if (typeof mod.default === 'function') {
    return new mod.default(config);
  }
  throw new Error(
    'Memory plugin does not export create(), a Provider class, or a default constructor.'
  );
}
