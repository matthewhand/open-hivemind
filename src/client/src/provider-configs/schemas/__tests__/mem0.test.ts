import { mem0ProviderSchema } from '../mem0';

describe('mem0ProviderSchema', () => {
    it('should have the correct type and label', () => {
        expect(mem0ProviderSchema.type).toBe('memory');
        expect(mem0ProviderSchema.label).toBe('Mem0');
        expect(mem0ProviderSchema.description).toContain('Mem0');
    });

    it('should define required API Key field', () => {
        const apiKeyField = mem0ProviderSchema.fields.find(f => f.name === 'apiKey');
        expect(apiKeyField).toBeDefined();
        expect(apiKeyField?.type).toBe('password');
        expect(apiKeyField?.required).toBe(true);
    });

    it('should define optional configuration fields', () => {
        const projectIdField = mem0ProviderSchema.fields.find(f => f.name === 'projectId');
        expect(projectIdField).toBeDefined();
        expect(projectIdField?.required).toBe(false);

        const customHostField = mem0ProviderSchema.fields.find(f => f.name === 'customHost');
        expect(customHostField).toBeDefined();
        expect(customHostField?.required).toBe(false);
    });
});
