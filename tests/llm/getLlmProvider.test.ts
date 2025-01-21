import { getLlmProvider } from '@llm/getLlmProvider';

describe('getLlmProvider', () => {
    it('should return a provider', () => {
        const provider = getLlmProvider();
        expect(provider).toBeDefined();
    });
});