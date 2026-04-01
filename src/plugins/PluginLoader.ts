import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import Debug from 'debug';
import type {
  ILlmProvider,
  IMemoryProvider,
  IMessengerService,
  IToolProvider,
} from '@hivemind/shared-types';
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
  type: 'llm' | 'message' | 'memory' | 'tool' | 'bot' | 'guard' | 'persona';
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
export async function loadPlugin(name: string): Promise<PluginModule> {
  // 1. Try built-in workspace package
  try {
    const mod = await import(`@hivemind/${name}`);
    debug('Loaded built-in plugin: @hivemind/%s', name);
    return mod;
  } catch (e: unknown) {
    if (
      e instanceof Error &&
      !e.message?.includes('Cannot find') &&
      (e as any).code !== 'ERR_MODULE_NOT_FOUND'
    )
      throw e;
  }

  // 2. Try community plugins dir
  const pluginPath = path.join(PLUGINS_DIR, name);
  try {
    await fs.promises.access(pluginPath);
    try {
      // Dynamic import doesn't use require cache, so no need to bust cache
      const mod = await import(pluginPath);
      debug('Loaded community plugin: %s', pluginPath);
      return mod;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Failed to load community plugin '${name}': ${msg}`);
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
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
export async function loadPluginWithSecurity(
  name: string,
  securityPolicy: PluginSecurityPolicy
): Promise<PluginModule> {
  const mod = await loadPlugin(name);

  // Determine if built-in (resolved from @hivemind/ namespace)
  let isBuiltIn = false;
  try {
    await import(`@hivemind/${name}`);
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

// ---------------------------------------------------------------------------
// Generic provider instantiation
// ---------------------------------------------------------------------------

/**
 * Generic provider instantiation logic shared by all provider types.
 *
 * Resolution order:
 *   1. `mod.create(config)` — preferred explicit factory
 *   2. `mod.<Name>Provider.getInstance(config)` — singleton pattern
 *   3. `new mod.<Name>Provider(config)` — constructor
 *   4. `new mod.default(config)` or `mod.default(config)` — default export
 *
 * @param mod          The loaded plugin module.
 * @param config       Optional configuration to pass to the factory/constructor.
 * @param typeSuffix   Class-name suffix to look for (default: 'Provider').
 * @param errorPrefix  Human-readable prefix for the error message.
 */
function instantiateProvider<T>(
  mod: PluginModule,
  config: AnyConfig | any | undefined,
  errorPrefix: string,
  typeSuffix = 'Provider'
): T {
  // Preferred: explicit factory
  if (typeof mod.create === 'function') {
    return mod.create(config);
  }
  // Fallback: singleton getInstance
  const singletonKey = Object.keys(mod).find(
    (k) => k.endsWith(typeSuffix) && typeof mod[k]?.getInstance === 'function'
  );
  if (singletonKey && typeof mod[singletonKey].getInstance === 'function') {
    return mod[singletonKey].getInstance(config);
  }
  // Fallback: constructor
  const ctor = Object.keys(mod).find((k) => k.endsWith(typeSuffix) && typeof mod[k] === 'function');
  if (ctor && typeof mod[ctor] === 'function') {
    return new mod[ctor](config);
  }
  // Fallback: default export
  if (typeof mod.default === 'function') {
    try {
      return new (mod.default as any)(config);
    } catch {
      return mod.default(config);
    }
  }
  throw new Error(
    `${errorPrefix} does not export create(), a ${typeSuffix} class, or a default constructor.`
  );
}

// ---------------------------------------------------------------------------
// Typed instantiation helpers
// ---------------------------------------------------------------------------

/**
 * Instantiate an LLM provider from a loaded module.
 */
export function instantiateLlmProvider(mod: PluginModule, config?: AnyConfig | any): ILlmProvider {
  return instantiateProvider<ILlmProvider>(mod, config, 'Plugin');
}

/**
 * Instantiate a message service from a loaded module.
 */
export function instantiateMessageService(
  mod: PluginModule,
  config?: AnyConfig | any
): IMessengerService {
  // Message services use 'Service' suffix rather than 'Provider'
  if (typeof mod.create === 'function') {
    return mod.create(config);
  }
  if (typeof mod.default === 'function') {
    return mod.default(config);
  }
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
 */
export function instantiateMemoryProvider(
  mod: PluginModule,
  config?: AnyConfig | any
): IMemoryProvider {
  return instantiateProvider<IMemoryProvider>(mod, config, 'Memory plugin');
}

/**
 * Instantiate a tool provider from a loaded module.
 */
export function instantiateToolProvider(
  mod: PluginModule,
  config?: AnyConfig | any
): IToolProvider {
  return instantiateProvider<IToolProvider>(mod, config, 'Tool plugin');
}

/**
 * Instantiate a bot from a loaded module.
 *
 * Contract (preferred): module exports `create(config)` → Bot instance
 * Fallback: known Bot class patterns.
 */
export function instantiateBot(mod: any, config?: any): any {
  // Preferred: explicit factory
  if (typeof mod.create === 'function') {
    return mod.create(config);
  }
  // Fallback: Bot constructor
  const ctor = Object.keys(mod).find((k) => k.includes('Bot') && typeof mod[k] === 'function');
  if (ctor) {
    return new mod[ctor](config);
  }
  // Fallback: default export
  if (typeof mod.default === 'function') {
    return new mod.default(config);
  }
  throw new Error('Bot plugin does not export create(), a Bot class, or a default constructor.');
}

/**
 * Instantiate a guard from a loaded module.
 *
 * Contract (preferred): module exports `create(config)` → Guard instance
 * Fallback: known Guard class patterns.
 */
export function instantiateGuard(mod: any, config?: any): any {
  // Preferred: explicit factory
  if (typeof mod.create === 'function') {
    return mod.create(config);
  }
  // Fallback: Guard constructor
  const ctor = Object.keys(mod).find((k) => k.includes('Guard') && typeof mod[k] === 'function');
  if (ctor) {
    return new mod[ctor](config);
  }
  // Fallback: default export
  if (typeof mod.default === 'function') {
    return new mod.default(config);
  }
  throw new Error(
    'Guard plugin does not export create(), a Guard class, or a default constructor.'
  );
}

/**
 * Instantiate a persona from a loaded module.
 *
 * Contract (preferred): module exports `create(config)` → Persona instance
 * Fallback: known Persona class patterns.
 */
export function instantiatePersona(mod: any, config?: any): any {
  // Preferred: explicit factory
  if (typeof mod.create === 'function') {
    return mod.create(config);
  }
  // Fallback: Persona constructor
  const ctor = Object.keys(mod).find((k) => k.includes('Persona') && typeof mod[k] === 'function');
  if (ctor) {
    return new mod[ctor](config);
  }
  // Fallback: default export
  if (typeof mod.default === 'function') {
    return new mod.default(config);
  }
  throw new Error(
    'Persona plugin does not export create(), a Persona class, or a default constructor.'
  );
}
