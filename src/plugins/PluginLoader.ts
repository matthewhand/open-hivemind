import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import Debug from 'debug';
import type { ILlmProvider, IMessengerService } from '@hivemind/shared-types';
import type { AnyConfig } from '../types/config';
import type {
  PluginCapability,
  PluginSecurityPolicy,
  SecurePluginManifest,
} from './PluginSecurity';

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
 * Load a plugin with security verification.
 *
 * Calls `loadPlugin` then runs the module's manifest through the security
 * policy to verify its signature and set trust / capability grants.
 *
 * @param name - Plugin package name.
 * @param securityPolicy - The active security policy instance.
 * @returns The loaded module (same as `loadPlugin`).
 */
export function loadPluginWithSecurity(
  name: string,
  securityPolicy: PluginSecurityPolicy
): PluginModule {
  const mod = loadPlugin(name);

  // Determine if built-in (resolved from @hivemind/ namespace)
  let isBuiltIn = false;
  try {
    require.resolve(`@hivemind/${name}`);
    isBuiltIn = true;
  } catch {
    // Not a built-in package
  }

  if (isBuiltIn) {
    securityPolicy.registerBuiltIn(name);
  }

  // Run signature verification and trust assignment
  const manifest = (mod.manifest ?? {}) as SecurePluginManifest;
  securityPolicy.verifyAndSetTrust(name, manifest);

  return mod;
}

/**
 * Guard that checks whether a plugin holds a required capability before
 * allowing a provider registration to proceed.
 *
 * @throws Error if the capability is denied.
 */
export function requireCapability(
  securityPolicy: PluginSecurityPolicy,
  pluginName: string,
  capability: PluginCapability
): void {
  if (!securityPolicy.hasCapability(pluginName, capability)) {
    throw new Error(
      `Plugin '${pluginName}' does not have the '${capability}' capability. ` +
        `Grant it via the admin dashboard or sign the plugin manifest.`
    );
  }
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
    } catch (e) {
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

/**
 * Instantiate a tool provider from a loaded module.
 *
 * Contract (preferred): module exports `create(config)` → IToolProvider
 * Fallback: known Provider class patterns.
 */
export function instantiateToolProvider(mod: any, config?: any): any {
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
    'Tool plugin does not export create(), a Provider class, or a default constructor.'
  );
}
