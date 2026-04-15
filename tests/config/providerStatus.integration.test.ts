import { getLlmDefaultStatus } from '../../src/config/llmDefaultStatus';
import { getMessageDefaultStatus } from '../../src/config/messageDefaultStatus';
import ProviderConfigManager from '../../src/config/ProviderConfigManager';

describe('Provider Status Integration', () => {
  it('should return valid LLM status structure', () => {
    const status = getLlmDefaultStatus();
    
    expect(status).toHaveProperty('configured');
    expect(Array.isArray(status.providers)).toBe(true);
    expect(status).toHaveProperty('libraryStatus');
    expect(status.libraryStatus).toHaveProperty('openai');
  });

  it('should return valid Message status structure', () => {
    const status = getMessageDefaultStatus();
    
    expect(status).toHaveProperty('configured');
    expect(Array.isArray(status.providers)).toBe(true);
    expect(status).toHaveProperty('libraryStatus');
    expect(status.libraryStatus).toHaveProperty('slack');
  });

  it('should reflect changes in ProviderConfigManager', () => {
    const manager = ProviderConfigManager.getInstance();
    const originalProviders = manager.getAllProviders();
    
    // Check that getLlmDefaultStatus uses the real manager
    const status = getLlmDefaultStatus();
    const enabledProviders = originalProviders.filter(p => p.enabled && (p.type === 'openai' || p.type === 'flowise'));
    
    // If there are enabled providers in real config, configured should be true
    if (enabledProviders.length > 0) {
      expect(status.configured).toBe(true);
    }
  });
});
