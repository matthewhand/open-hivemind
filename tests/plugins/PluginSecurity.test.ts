import {
  PluginSecurityPolicy,
  verifyPluginSignature,
  signManifest,
  canonicalizeManifest,
  VALID_CAPABILITIES,
  type SecurePluginManifest,
  type PluginSecurityAuditEvent,
  type PluginCapability,
} from '../../src/plugins/PluginSecurity';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_KEY = 'test-signing-key-256bit-secret';

function makeManifest(overrides: Partial<SecurePluginManifest> = {}): SecurePluginManifest {
  return {
    displayName: 'Test Plugin',
    description: 'A test plugin',
    type: 'llm',
    ...overrides,
  };
}

function makeSignedManifest(
  overrides: Partial<SecurePluginManifest> = {},
  key = TEST_KEY
): SecurePluginManifest {
  const manifest = makeManifest(overrides);
  manifest.signature = signManifest(manifest, key);
  return manifest;
}

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

describe('Plugin Signature Verification', () => {
  it('should verify a valid signature', () => {
    const manifest = makeSignedManifest();
    expect(verifyPluginSignature(manifest, TEST_KEY)).toBe(true);
  });

  it('should reject an invalid signature', () => {
    const manifest = makeSignedManifest();
    manifest.signature = 'deadbeef'.repeat(8); // wrong signature, correct length
    expect(verifyPluginSignature(manifest, TEST_KEY)).toBe(false);
  });

  it('should reject when signature is missing', () => {
    const manifest = makeManifest();
    expect(verifyPluginSignature(manifest, TEST_KEY)).toBe(false);
  });

  it('should reject when signed with a different key', () => {
    const manifest = makeSignedManifest({}, 'other-key');
    expect(verifyPluginSignature(manifest, TEST_KEY)).toBe(false);
  });

  it('should reject a malformed hex signature', () => {
    const manifest = makeManifest({ signature: 'not-hex-at-all!' });
    expect(verifyPluginSignature(manifest, TEST_KEY)).toBe(false);
  });

  it('should produce deterministic canonical form', () => {
    const a = makeManifest({ displayName: 'A', description: 'B' });
    const b = makeManifest({ description: 'B', displayName: 'A' });
    expect(canonicalizeManifest(a)).toBe(canonicalizeManifest(b));
  });

  it('should exclude the signature field from canonical form', () => {
    const unsigned = makeManifest();
    const signed = makeSignedManifest();
    expect(canonicalizeManifest(unsigned)).toBe(canonicalizeManifest(signed));
  });
});

// ---------------------------------------------------------------------------
// PluginSecurityPolicy — trust levels
// ---------------------------------------------------------------------------

describe('PluginSecurityPolicy', () => {
  let policy: PluginSecurityPolicy;
  let auditEvents: PluginSecurityAuditEvent[];

  beforeEach(() => {
    policy = new PluginSecurityPolicy(TEST_KEY);
    auditEvents = [];
    policy.on('audit', (evt: PluginSecurityAuditEvent) => auditEvents.push(evt));
  });

  // -----------------------------------------------------------------------
  // Built-in plugins
  // -----------------------------------------------------------------------

  describe('built-in plugins', () => {
    it('should bypass signature check and receive all capabilities', () => {
      policy.registerBuiltIn('llm-openai');
      const trust = policy.verifyAndSetTrust('llm-openai', makeManifest());

      expect(trust).toBe('trusted');
      for (const cap of VALID_CAPABILITIES) {
        expect(policy.hasCapability('llm-openai', cap)).toBe(true);
      }
    });

    it('should report isBuiltIn in security status', () => {
      policy.registerBuiltIn('llm-openai');
      policy.verifyAndSetTrust('llm-openai', makeManifest());

      const status = policy.getPluginSecurityStatus('llm-openai');
      expect(status).not.toBeNull();
      expect(status!.isBuiltIn).toBe(true);
      expect(status!.trustLevel).toBe('trusted');
    });
  });

  // -----------------------------------------------------------------------
  // Signature-based trust
  // -----------------------------------------------------------------------

  describe('external plugins with valid signature', () => {
    it('should be trusted and granted requested capabilities', () => {
      const manifest = makeSignedManifest({
        requiredCapabilities: ['network', 'llm'],
      });
      const trust = policy.verifyAndSetTrust('llm-community', manifest);

      expect(trust).toBe('trusted');
      expect(policy.hasCapability('llm-community', 'network')).toBe(true);
      expect(policy.hasCapability('llm-community', 'llm')).toBe(true);
      expect(policy.hasCapability('llm-community', 'exec')).toBe(false);
    });
  });

  describe('external plugins with invalid signature', () => {
    it('should be untrusted with no capabilities', () => {
      const manifest = makeManifest({
        signature: 'bad'.repeat(21) + 'b', // 64 hex chars
        requiredCapabilities: ['network'],
      });
      const trust = policy.verifyAndSetTrust('llm-evil', manifest);

      expect(trust).toBe('untrusted');
      expect(policy.hasCapability('llm-evil', 'network')).toBe(false);
    });
  });

  describe('external plugins with missing signature', () => {
    it('should be untrusted with no capabilities', () => {
      const manifest = makeManifest({ requiredCapabilities: ['network'] });
      const trust = policy.verifyAndSetTrust('llm-unsigned', manifest);

      expect(trust).toBe('untrusted');
      expect(policy.hasCapability('llm-unsigned', 'network')).toBe(false);
    });

    it('should emit signature_missing audit event', () => {
      const manifest = makeManifest();
      policy.verifyAndSetTrust('llm-unsigned', manifest);

      const missing = auditEvents.filter((e) => e.event === 'signature_missing');
      expect(missing.length).toBe(1);
      expect(missing[0].pluginName).toBe('llm-unsigned');
    });
  });

  // -----------------------------------------------------------------------
  // Capability management
  // -----------------------------------------------------------------------

  describe('capability grant/deny', () => {
    it('should allow manual grant of a capability', () => {
      const manifest = makeManifest();
      policy.verifyAndSetTrust('llm-unsigned', manifest);

      expect(policy.hasCapability('llm-unsigned', 'network')).toBe(false);

      policy.grantCapability('llm-unsigned', 'network');
      expect(policy.hasCapability('llm-unsigned', 'network')).toBe(true);
    });

    it('should allow revocation of a capability', () => {
      const manifest = makeSignedManifest({ requiredCapabilities: ['network'] });
      policy.verifyAndSetTrust('llm-ext', manifest);
      expect(policy.hasCapability('llm-ext', 'network')).toBe(true);

      policy.revokeCapability('llm-ext', 'network');
      expect(policy.hasCapability('llm-ext', 'network')).toBe(false);
    });

    it('should reject invalid capability names on grant', () => {
      expect(() =>
        policy.grantCapability('llm-test', 'hack-the-planet' as PluginCapability)
      ).toThrow('Invalid capability');
    });

    it('should report denied capabilities in security status', () => {
      const manifest = makeManifest({ requiredCapabilities: ['network', 'exec'] });
      policy.verifyAndSetTrust('llm-unsigned', manifest);

      const status = policy.getPluginSecurityStatus('llm-unsigned');
      expect(status).not.toBeNull();
      expect(status!.deniedCapabilities).toContain('network');
      expect(status!.deniedCapabilities).toContain('exec');
      expect(status!.grantedCapabilities).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Audit events
  // -----------------------------------------------------------------------

  describe('audit logging', () => {
    it('should emit audit events for plugin load', () => {
      const manifest = makeSignedManifest();
      policy.verifyAndSetTrust('llm-audited', manifest);

      const loadEvents = auditEvents.filter((e) => e.event === 'plugin_load');
      expect(loadEvents.length).toBe(1);
      expect(loadEvents[0].pluginName).toBe('llm-audited');
    });

    it('should emit audit events for plugin unload', () => {
      policy.registerBuiltIn('llm-test');
      policy.verifyAndSetTrust('llm-test', makeManifest());
      policy.recordUnload('llm-test');

      const unloadEvents = auditEvents.filter((e) => e.event === 'plugin_unload');
      expect(unloadEvents.length).toBe(1);
    });

    it('should emit audit events for capability requests', () => {
      const manifest = makeSignedManifest({ requiredCapabilities: ['network'] });
      policy.verifyAndSetTrust('llm-cap', manifest);

      policy.hasCapability('llm-cap', 'network');
      policy.hasCapability('llm-cap', 'exec');

      const requests = auditEvents.filter((e) => e.event === 'capability_request');
      expect(requests.length).toBe(2);

      const grants = auditEvents.filter(
        (e) => e.event === 'capability_granted' && e.details.capability === 'network' && !e.details.manual
      );
      expect(grants.length).toBeGreaterThanOrEqual(1);

      const denials = auditEvents.filter(
        (e) => e.event === 'capability_denied' && e.details.capability === 'exec'
      );
      expect(denials.length).toBe(1);
    });

    it('should emit signature_verified for valid signatures', () => {
      const manifest = makeSignedManifest();
      policy.verifyAndSetTrust('llm-verified', manifest);

      const verified = auditEvents.filter((e) => e.event === 'signature_verified');
      expect(verified.length).toBe(1);
      expect(verified[0].details.signatureValid).toBe(true);
    });

    it('should emit signature_failed for invalid signatures', () => {
      const manifest = makeManifest({ signature: 'a'.repeat(64) });
      policy.verifyAndSetTrust('llm-bad-sig', manifest);

      const failed = auditEvents.filter((e) => e.event === 'signature_failed');
      expect(failed.length).toBe(1);
    });

    it('should include timestamps in all audit events', () => {
      policy.verifyAndSetTrust('llm-ts', makeManifest());

      for (const evt of auditEvents) {
        expect(typeof evt.timestamp).toBe('string');
        expect(new Date(evt.timestamp).getTime()).not.toBeNaN();
      }
    });
  });

  // -----------------------------------------------------------------------
  // Unload / cleanup
  // -----------------------------------------------------------------------

  describe('unload', () => {
    it('should clear all state for a plugin on unload', () => {
      policy.registerBuiltIn('llm-temp');
      policy.verifyAndSetTrust('llm-temp', makeManifest());

      expect(policy.getPluginSecurityStatus('llm-temp')).not.toBeNull();

      policy.recordUnload('llm-temp');
      expect(policy.getPluginSecurityStatus('llm-temp')).toBeNull();
      expect(policy.isBuiltIn('llm-temp')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // getAllSecurityStatus
  // -----------------------------------------------------------------------

  describe('getAllSecurityStatus', () => {
    it('should return status for all tracked plugins', () => {
      policy.registerBuiltIn('llm-openai');
      policy.verifyAndSetTrust('llm-openai', makeManifest());
      policy.verifyAndSetTrust('llm-community', makeSignedManifest({ requiredCapabilities: ['network'] }));
      policy.verifyAndSetTrust('llm-unsigned', makeManifest());

      const all = policy.getAllSecurityStatus();
      expect(all.length).toBe(3);

      const names = all.map((s) => s.pluginName).sort();
      expect(names).toEqual(['llm-community', 'llm-openai', 'llm-unsigned']);
    });
  });
});
