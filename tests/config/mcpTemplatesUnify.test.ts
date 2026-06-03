import 'reflect-metadata';
import { ToolRegistry } from '@src/config/mcp/toolRegistry';
import { MCP_TEMPLATES, toMCPProviderTemplates } from '@src/mcp/templates';

/**
 * Regression coverage for the unification of the two previously-disconnected
 * MCP template registries. `ToolRegistry.getTemplates()` (the source exposed by
 * the `GET /api/mcp/providers/templates` API the UI consumes) must be derived
 * from the static `MCP_TEMPLATES` registry in `src/mcp/templates.ts`, so the
 * static templates are no longer dead and the two cannot drift apart.
 */
describe('MCP template unification', () => {
  it('ToolRegistry.getTemplates() is derived from the static MCP_TEMPLATES registry', () => {
    const registry = new ToolRegistry();
    const templates = registry.getTemplates();

    // Same number of templates, in the same order, as the single source.
    expect(templates).toHaveLength(MCP_TEMPLATES.length);
    expect(templates.map((t) => t.id)).toEqual(MCP_TEMPLATES.map((t) => t.id));

    // It returns exactly the mapped provider-template shape.
    expect(templates).toEqual(toMCPProviderTemplates());
  });

  it('maps a quick-install template onto the provider-template shape', () => {
    const source = MCP_TEMPLATES.find((t) => t.id === 'google-search');
    expect(source).toBeDefined();

    const mapped = new ToolRegistry().getTemplates().find((t) => t.id === 'google-search');
    expect(mapped).toMatchObject({
      id: 'google-search',
      name: source!.name,
      type: 'cloud',
      description: source!.description,
      command: source!.defaultUrl,
      documentation: source!.docsUrl,
      enabledByDefault: false,
    });

    // Each required config field becomes a required env var.
    expect(mapped!.envVars.map((v) => v.name)).toEqual(
      source!.requiredConfigFields.map((f) => f.key),
    );
    expect(mapped!.envVars.every((v) => v.required)).toBe(true);
  });

  it('createFromTemplate works against a unified template id', () => {
    const registry = new ToolRegistry();
    const config = registry.createFromTemplate('google-search', {});

    expect(config.name).toBe('Google Search');
    expect(config.type).toBe('cloud');
    // Env vars come from the static template's required config fields.
    expect(Object.keys(config.env ?? {})).toEqual(
      expect.arrayContaining(['API_KEY', 'CX']),
    );
  });
});
