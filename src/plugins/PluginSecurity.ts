import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import Debug from 'debug';
import type { PluginManifest } from './PluginLoader';

const debug = Debug('app:pluginSecurity');

// ---------------------------------------------------------------------------
// Capability definitions
// ---------------------------------------------------------------------------

/**
 * Capabilities that a plugin can request. Each maps to a category of
 * system resources a plugin might need access to.
 */
export const VALID_CAPABILITIES = [
  'network',
  'filesystem',
  'database',
  'config',
  'exec',
  'llm',
  'memory',
] as const;

export type PluginCapability = (typeof VALID_CAPABILITIES)[number];

// ---------------------------------------------------------------------------
// Extended manifest with security fields
// ---------------------------------------------------------------------------

/**
 * Extends the base PluginManifest with optional security fields.
 * Community plugins should declare these; built-in plugins may omit them.
 */
export interface SecurePluginManifest extends PluginManifest {
  /** HMAC-SHA256 hex digest of the canonical manifest content (excluding the signature field itself) */
  signature?: string;
  /** Capabilities this plugin requires to function */
  requiredCapabilities?: string[];
}

// ---------------------------------------------------------------------------
// Trust level
// ---------------------------------------------------------------------------

export type TrustLevel = 'trusted' | 'untrusted';

// ---------------------------------------------------------------------------
// Audit event types
// ---------------------------------------------------------------------------

export interface PluginSecurityAuditEvent {
  timestamp: string;
  event:
    | 'plugin_load'
    | 'plugin_unload'
    | 'signature_verified'
    | 'signature_failed'
    | 'signature_missing'
    | 'capability_granted'
    | 'capability_denied'
    | 'capability_request';
  pluginName: string;
  details: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

/**
 * Produce the canonical string representation of a manifest for signing.
 * Excludes the `signature` field itself so the signature can be verified
 * after embedding it in the manifest.
 */
export function canonicalizeManifest(manifest: SecurePluginManifest): string {
  const { signature: _sig, ...rest } = manifest;
  // Deterministic JSON: sorted keys
  return JSON.stringify(rest, Object.keys(rest).sort());
}

/**
 * Create an HMAC-SHA256 signature for a plugin manifest.
 *
 * @param manifest - The manifest to sign (signature field is excluded from input).
 * @param secretKey - The shared secret / signing key.
 * @returns Hex-encoded HMAC-SHA256 digest.
 */
export function signManifest(manifest: SecurePluginManifest, secretKey: string): string {
  const canonical = canonicalizeManifest(manifest);
  return crypto.createHmac('sha256', secretKey).update(canonical).digest('hex');
}

/**
 * Verify the HMAC-SHA256 signature embedded in a plugin manifest.
 *
 * @param manifest - The manifest with a `signature` field.
 * @param secretKey - The shared secret / signing key.
 * @returns `true` if the signature is valid, `false` otherwise.
 */
export function verifyPluginSignature(manifest: SecurePluginManifest, secretKey: string): boolean {
  if (!manifest.signature) {
    return false;
  }
  const expected = signManifest(manifest, secretKey);
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(manifest.signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    // Lengths differ or invalid hex
    return false;
  }
}

// ---------------------------------------------------------------------------
// PluginSecurityPolicy
// ---------------------------------------------------------------------------

export interface PluginSecurityStatus {
  pluginName: string;
  trustLevel: TrustLevel;
  isBuiltIn: boolean;
  signatureValid: boolean | null; // null = no signature present
  grantedCapabilities: PluginCapability[];
  deniedCapabilities: PluginCapability[];
  requiredCapabilities: string[];
}

/**
 * Central security policy manager for the plugin system.
 *
 * - Tracks which plugins are built-in vs external
 * - Manages per-plugin capability grants
 * - Emits audit events for all security-relevant operations
 */
export class PluginSecurityPolicy extends EventEmitter {
  /** Signing key for manifest verification */
  private readonly signingKey: string;

  /** Set of plugin names that are considered built-in */
  private readonly builtInPlugins = new Set<string>();

  /** Per-plugin granted capabilities */
  private readonly grants = new Map<string, Set<PluginCapability>>();

  /** Per-plugin trust level */
  private readonly trustLevels = new Map<string, TrustLevel>();

  /** Per-plugin signature status: true = valid, false = invalid, null = missing */
  private readonly signatureStatus = new Map<string, boolean | null>();

  /** Per-plugin required capabilities from manifest */
  private readonly requiredCapabilities = new Map<string, string[]>();

  constructor(signingKey: string) {
    super();
    this.signingKey = signingKey;
  }

  // -----------------------------------------------------------------------
  // Audit helpers
  // -----------------------------------------------------------------------

  private emitAudit(
    event: PluginSecurityAuditEvent['event'],
    pluginName: string,
    details: Record<string, any> = {}
  ): void {
    const auditEvent: PluginSecurityAuditEvent = {
      timestamp: new Date().toISOString(),
      event,
      pluginName,
      details,
    };
    debug('audit: %s %s %o', event, pluginName, details);
    this.emit('audit', auditEvent);
  }

  // -----------------------------------------------------------------------
  // Built-in plugin management
  // -----------------------------------------------------------------------

  /**
   * Register a plugin name as built-in. Built-in plugins:
   * - Skip signature verification
   * - Receive all capabilities automatically
   */
  registerBuiltIn(name: string): void {
    this.builtInPlugins.add(name);
    this.trustLevels.set(name, 'trusted');
    this.signatureStatus.set(name, null);
    this.grants.set(name, new Set(VALID_CAPABILITIES));
  }

  isBuiltIn(name: string): boolean {
    return this.builtInPlugins.has(name);
  }

  // -----------------------------------------------------------------------
  // Signature verification (integrated)
  // -----------------------------------------------------------------------

  /**
   * Verify a plugin's manifest signature and set its trust level accordingly.
   * Built-in plugins bypass verification entirely.
   *
   * @returns The resulting trust level.
   */
  verifyAndSetTrust(name: string, manifest: SecurePluginManifest): TrustLevel {
    // Built-in plugins are always trusted
    if (this.builtInPlugins.has(name)) {
      this.emitAudit('signature_verified', name, { builtIn: true });
      return 'trusted';
    }

    const required = manifest.requiredCapabilities ?? [];
    this.requiredCapabilities.set(name, required);

    if (!manifest.signature) {
      this.signatureStatus.set(name, null);
      this.trustLevels.set(name, 'untrusted');
      // Untrusted plugins get no capabilities by default
      this.grants.set(name, new Set());
      this.emitAudit('signature_missing', name, {});
      this.emitAudit('plugin_load', name, { trustLevel: 'untrusted', signaturePresent: false });
      return 'untrusted';
    }

    const valid = verifyPluginSignature(manifest, this.signingKey);
    this.signatureStatus.set(name, valid);

    if (valid) {
      this.trustLevels.set(name, 'trusted');
      // Trusted external plugins get their requested capabilities (if valid)
      const granted = new Set<PluginCapability>();
      for (const cap of required) {
        if (VALID_CAPABILITIES.includes(cap as PluginCapability)) {
          granted.add(cap as PluginCapability);
        }
      }
      this.grants.set(name, granted);
      this.emitAudit('signature_verified', name, { signatureValid: true });
      this.emitAudit('plugin_load', name, {
        trustLevel: 'trusted',
        grantedCapabilities: [...granted],
      });
      return 'trusted';
    } else {
      this.trustLevels.set(name, 'untrusted');
      this.grants.set(name, new Set());
      this.emitAudit('signature_failed', name, { signatureValid: false });
      this.emitAudit('plugin_load', name, {
        trustLevel: 'untrusted',
        signaturePresent: true,
        signatureValid: false,
      });
      return 'untrusted';
    }
  }

  // -----------------------------------------------------------------------
  // Capability checks
  // -----------------------------------------------------------------------

  /**
   * Check whether a plugin has been granted a specific capability.
   * Emits audit events for the request and grant/deny outcome.
   */
  hasCapability(pluginName: string, capability: PluginCapability): boolean {
    this.emitAudit('capability_request', pluginName, { capability });

    const granted = this.grants.get(pluginName);
    if (granted && granted.has(capability)) {
      this.emitAudit('capability_granted', pluginName, { capability });
      return true;
    }

    this.emitAudit('capability_denied', pluginName, { capability });
    return false;
  }

  /**
   * Manually grant a capability to a plugin (e.g. admin approval).
   */
  grantCapability(pluginName: string, capability: PluginCapability): void {
    if (!VALID_CAPABILITIES.includes(capability)) {
      throw new Error(`Invalid capability: '${capability}'`);
    }
    let caps = this.grants.get(pluginName);
    if (!caps) {
      caps = new Set();
      this.grants.set(pluginName, caps);
    }
    caps.add(capability);
    this.emitAudit('capability_granted', pluginName, { capability, manual: true });
  }

  /**
   * Manually revoke a capability from a plugin.
   */
  revokeCapability(pluginName: string, capability: PluginCapability): void {
    const caps = this.grants.get(pluginName);
    if (caps) {
      caps.delete(capability);
      this.emitAudit('capability_denied', pluginName, { capability, revoked: true });
    }
  }

  // -----------------------------------------------------------------------
  // Unload tracking
  // -----------------------------------------------------------------------

  /**
   * Record that a plugin has been unloaded. Clears its grants and trust.
   */
  recordUnload(pluginName: string): void {
    this.emitAudit('plugin_unload', pluginName, {});
    this.grants.delete(pluginName);
    this.trustLevels.delete(pluginName);
    this.signatureStatus.delete(pluginName);
    this.requiredCapabilities.delete(pluginName);
    this.builtInPlugins.delete(pluginName);
  }

  // -----------------------------------------------------------------------
  // Status reporting (for admin dashboard)
  // -----------------------------------------------------------------------

  /**
   * Get the security status summary for a single plugin.
   */
  getPluginSecurityStatus(pluginName: string): PluginSecurityStatus | null {
    const trustLevel = this.trustLevels.get(pluginName);
    if (!trustLevel) return null;

    const granted = [...(this.grants.get(pluginName) ?? [])];
    const required = this.requiredCapabilities.get(pluginName) ?? [];
    const denied = required.filter(
      (c) =>
        VALID_CAPABILITIES.includes(c as PluginCapability) &&
        !granted.includes(c as PluginCapability)
    ) as PluginCapability[];

    return {
      pluginName,
      trustLevel,
      isBuiltIn: this.builtInPlugins.has(pluginName),
      signatureValid: this.signatureStatus.get(pluginName) ?? null,
      grantedCapabilities: granted,
      deniedCapabilities: denied,
      requiredCapabilities: required,
    };
  }

  /**
   * Get security status for all tracked plugins.
   */
  getAllSecurityStatus(): PluginSecurityStatus[] {
    const results: PluginSecurityStatus[] = [];
    for (const name of this.trustLevels.keys()) {
      const status = this.getPluginSecurityStatus(name);
      if (status) results.push(status);
    }
    return results;
  }
}
