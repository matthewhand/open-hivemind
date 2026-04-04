import {
  ApplyTemplateSchema,
  CreateTemplateSchema,
  DeleteTemplateSchema,
} from '../../../src/validation/schemas/templatesSchema';
import { EmptyBodySchema } from '../../../src/validation/schemas/usageTrackingSchema';

describe('templatesSchema', () => {
  describe('CreateTemplateSchema', () => {
    const valid = {
      body: {
        name: 'My Template',
        description: 'A test template',
        category: 'discord' as const,
        config: { key: 'value' },
      },
    };

    it('accepts valid input', () => {
      expect(() => CreateTemplateSchema.parse(valid)).not.toThrow();
    });

    it('rejects missing name', () => {
      const result = CreateTemplateSchema.safeParse({
        body: { ...valid.body, name: '' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing description', () => {
      const result = CreateTemplateSchema.safeParse({
        body: { ...valid.body, description: '' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid category', () => {
      const result = CreateTemplateSchema.safeParse({
        body: { ...valid.body, category: 'invalid' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty config', () => {
      const result = CreateTemplateSchema.safeParse({
        body: { ...valid.body, config: {} },
      });
      expect(result.success).toBe(false);
    });

    it('accepts all valid categories', () => {
      const categories = ['discord', 'slack', 'mattermost', 'webhook', 'llm', 'general'];
      categories.forEach((category) => {
        const result = CreateTemplateSchema.safeParse({
          body: { ...valid.body, category },
        });
        expect(result.success).toBe(true);
      });
    });

    it('accepts optional tags array', () => {
      const result = CreateTemplateSchema.safeParse({
        body: { ...valid.body, tags: ['tag1', 'tag2'] },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ApplyTemplateSchema', () => {
    const valid = {
      params: { id: 'template-123' },
      body: { name: 'My Bot' },
    };

    it('accepts valid input', () => {
      expect(() => ApplyTemplateSchema.parse(valid)).not.toThrow();
    });

    it('rejects empty template id', () => {
      const result = ApplyTemplateSchema.safeParse({
        ...valid,
        params: { id: '' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing bot name', () => {
      const result = ApplyTemplateSchema.safeParse({
        ...valid,
        body: { name: '' },
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional description and overrides', () => {
      const result = ApplyTemplateSchema.safeParse({
        ...valid,
        body: { name: 'Bot', description: 'desc', overrides: { key: 'val' } },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('DeleteTemplateSchema', () => {
    it('accepts valid id param', () => {
      expect(() => DeleteTemplateSchema.parse({ params: { id: 'abc' } })).not.toThrow();
    });

    it('rejects empty id', () => {
      const result = DeleteTemplateSchema.safeParse({ params: { id: '' } });
      expect(result.success).toBe(false);
    });
  });
});

describe('usageTrackingSchema', () => {
  describe('EmptyBodySchema', () => {
    it('accepts empty body', () => {
      expect(() => EmptyBodySchema.parse({ body: {} })).not.toThrow();
    });

    it('accepts missing body', () => {
      expect(() => EmptyBodySchema.parse({})).not.toThrow();
    });

    it('rejects body with unexpected fields', () => {
      const result = EmptyBodySchema.safeParse({ body: { unexpected: 'field' } });
      expect(result.success).toBe(false);
    });
  });
});
