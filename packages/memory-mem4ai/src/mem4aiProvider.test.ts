import { create, manifest, Mem4aiProvider } from './mem4aiProvider';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const baseConfig = { apiUrl: 'https://api.mem4ai.com/v1', apiKey: 'test-key' };

beforeEach(() => mockFetch.mockReset());

describe('Mem4aiProvider', () => {
  it('throws if apiUrl missing', () => {
    expect(() => new Mem4aiProvider({ apiUrl: '', apiKey: 'k' })).toThrow('API URL is required');
  });

  it('throws if apiKey missing', () => {
    expect(() => new Mem4aiProvider({ apiUrl: 'http://x', apiKey: '' })).toThrow(
      'API key is required'
    );
  });

  it('create() returns a Mem4aiProvider instance', () => {
    expect(create(baseConfig)).toBeInstanceOf(Mem4aiProvider);
  });

  it('manifest has correct type', () => {
    expect(manifest.type).toBe('memory');
  });

  it('addMemory returns a MemoryEntry', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'mem-1', content: 'hello', metadata: {}, tags: [] }),
    });
    const provider = new Mem4aiProvider(baseConfig);
    const result = await provider.addMemory('hello');
    expect(result.id).toBe('mem-1');
    expect(result.content).toBe('hello');
  });

  it('searchMemories returns SearchResult[]', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ id: 'mem-1', content: 'hello', score: 0.9 }] }),
    });
    const provider = new Mem4aiProvider(baseConfig);
    const results = await provider.searchMemories('hello');
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(0.9);
  });

  it('deleteMemory returns true on success', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const provider = new Mem4aiProvider(baseConfig);
    expect(await provider.deleteMemory('mem-1')).toBe(true);
  });

  it('healthCheck returns true on success', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const provider = new Mem4aiProvider(baseConfig);
    expect(await provider.healthCheck()).toBe(true);
  });

  it('healthCheck returns false on error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    const provider = new Mem4aiProvider(baseConfig);
    expect(await provider.healthCheck()).toBe(false);
  });
});
