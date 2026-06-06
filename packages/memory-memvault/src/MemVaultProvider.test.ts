import type { IServiceDependencies } from '@hivemind/shared-types';
import { InMemoryMemVaultStore } from './InMemoryMemVaultStore';
import { MemVaultProvider } from './MemVaultProvider';

/**
 * Deterministic fake embedding: maps known phrases to fixed unit vectors so we
 * can assert ranking behaviour without a real LLM. Unknown text falls back to a
 * neutral vector.
 */
const VECTORS: Record<string, number[]> = {
  cat: [1, 0, 0],
  dog: [0.9, 0.1, 0],
  car: [0, 0, 1],
};

function makeDeps(generateEmbedding?: jest.Mock): {
  deps: IServiceDependencies;
  embed: jest.Mock;
} {
  const embed =
    generateEmbedding ?? jest.fn(async (text: string) => VECTORS[text] ?? [0.5, 0.5, 0.5]);
  const deps = {
    logger: console as unknown,
    errorTypes: {},
    getLlmProviders: () => [{ name: 'fake-embed', generateEmbedding: embed }],
  } as unknown as IServiceDependencies;
  return { deps, embed };
}

describe('MemVaultProvider', () => {
  it('adds a memory and returns an entry with a generated id', async () => {
    const { deps, embed } = makeDeps();
    const provider = new MemVaultProvider({}, deps);

    const entry = await provider.addMemory('cat', { kind: 'animal' }, { userId: 'u1' });

    expect(embed).toHaveBeenCalledWith('cat');
    expect(entry.id).toBeTruthy();
    expect(entry.content).toBe('cat');
    expect(entry.metadata).toEqual({ kind: 'animal' });
    expect(entry.userId).toBe('u1');
  });

  it('ranks semantically closer memories first', async () => {
    const { deps } = makeDeps();
    const provider = new MemVaultProvider({}, deps);

    await provider.addMemory('car');
    await provider.addMemory('dog');
    await provider.addMemory('cat');

    const { results } = await provider.searchMemories('cat');
    expect(results[0].content).toBe('cat');
    expect(results[1].content).toBe('dog');
    expect(results[2].content).toBe('car');
    // Hybrid score stays within [0, 1].
    expect(results[0].score).toBeLessThanOrEqual(1);
    expect(results[0].score).toBeGreaterThan(results[2].score!);
  });

  it('applies a similarity/recency threshold filter', async () => {
    const { deps } = makeDeps();
    const provider = new MemVaultProvider({}, deps);
    await provider.addMemory('car');

    // A query for "cat" against only "car" (orthogonal) yields a low score.
    const { results } = await provider.searchMemories('cat', { threshold: 0.5 });
    expect(results).toHaveLength(0);
  });

  it('respects the limit option', async () => {
    const { deps } = makeDeps();
    const provider = new MemVaultProvider({}, deps);
    await provider.addMemory('cat');
    await provider.addMemory('dog');
    await provider.addMemory('car');

    const { results } = await provider.searchMemories('cat', { limit: 2 });
    expect(results).toHaveLength(2);
  });

  it('scopes search by userId', async () => {
    const { deps } = makeDeps();
    const provider = new MemVaultProvider({}, deps);
    await provider.addMemory('cat', undefined, { userId: 'alice' });
    await provider.addMemory('cat', undefined, { userId: 'bob' });

    const { results } = await provider.searchMemories('cat', { userId: 'alice' });
    expect(results).toHaveLength(1);
    expect(results[0].userId).toBe('alice');
  });

  it('gets a memory by id and returns null when missing', async () => {
    const { deps } = makeDeps();
    const provider = new MemVaultProvider({}, deps);
    const added = await provider.addMemory('cat');

    expect((await provider.getMemory(added.id))?.content).toBe('cat');
    expect(await provider.getMemory('nope')).toBeNull();
  });

  it('updates an existing memory and re-embeds the new content', async () => {
    const { deps, embed } = makeDeps();
    const provider = new MemVaultProvider({}, deps);
    const added = await provider.addMemory('cat');
    embed.mockClear();

    const updated = await provider.updateMemory(added.id, 'dog', { edited: true });
    expect(embed).toHaveBeenCalledWith('dog');
    expect(updated.id).toBe(added.id);
    expect(updated.content).toBe('dog');
    expect(updated.metadata).toEqual({ edited: true });
  });

  it('throws when updating a non-existent memory', async () => {
    const { deps } = makeDeps();
    const provider = new MemVaultProvider({}, deps);
    await expect(provider.updateMemory('missing', 'x')).rejects.toThrow(/not found/);
  });

  it('deletes a memory', async () => {
    const { deps } = makeDeps();
    const provider = new MemVaultProvider({}, deps);
    const added = await provider.addMemory('cat');
    await provider.deleteMemory(added.id);
    expect(await provider.getMemory(added.id)).toBeNull();
  });

  it('deleteAll respects scope', async () => {
    const { deps } = makeDeps();
    const provider = new MemVaultProvider({}, deps);
    await provider.addMemory('cat', undefined, { userId: 'alice' });
    await provider.addMemory('dog', undefined, { userId: 'bob' });

    await provider.deleteAll({ userId: 'alice' });
    expect(await provider.getMemories({ userId: 'alice' })).toHaveLength(0);
    expect(await provider.getMemories({ userId: 'bob' })).toHaveLength(1);
  });

  it('lists memories most-recent-first', async () => {
    const { deps } = makeDeps();
    const provider = new MemVaultProvider({}, deps);
    const a = await provider.addMemory('cat');
    // Force a later timestamp on the second entry.
    await new Promise((r) => setTimeout(r, 2));
    const b = await provider.addMemory('dog');

    const list = await provider.getMemories();
    expect(list[0].id).toBe(b.id);
    expect(list[1].id).toBe(a.id);
  });

  it('healthCheck reports ok when store and embedding are available', async () => {
    const { deps } = makeDeps();
    const provider = new MemVaultProvider({}, deps);
    expect((await provider.healthCheck()).status).toBe('ok');
  });

  it('healthCheck reports error without an embedding provider', async () => {
    const deps = {
      logger: console as unknown,
      errorTypes: {},
      getLlmProviders: () => [],
    } as unknown as IServiceDependencies;
    const provider = new MemVaultProvider({}, deps);
    const health = await provider.healthCheck();
    expect(health.status).toBe('error');
  });

  it('throws on add when no embedding provider is available', async () => {
    const provider = new MemVaultProvider({});
    await expect(provider.addMemory('cat')).rejects.toThrow(/embedding provider not available/);
  });

  it('accepts a custom store instance', async () => {
    const { deps } = makeDeps();
    const store = new InMemoryMemVaultStore();
    const provider = new MemVaultProvider({}, deps, store);
    const added = await provider.addMemory('cat');
    // The record landed in the injected store.
    expect(await store.get(added.id)).not.toBeNull();
  });
});
