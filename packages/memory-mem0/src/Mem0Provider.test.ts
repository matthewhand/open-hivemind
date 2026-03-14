import { Mem0Provider, create, manifest } from './Mem0Provider';

jest.mock('mem0ai/oss', () => ({
    Memory: jest.fn().mockImplementation(() => ({
        add: jest.fn().mockResolvedValue({ results: [{ id: 'm1', memory: 'fact' }] }),
        search: jest.fn().mockResolvedValue({ results: [{ id: 'm1', memory: 'fact', score: 0.95 }] }),
        getAll: jest.fn().mockResolvedValue({ results: [{ id: 'm1', memory: 'fact' }] }),
        get: jest.fn().mockResolvedValue({ id: 'm1', memory: 'fact' }),
        update: jest.fn().mockResolvedValue({ id: 'm1', memory: 'updated' }),
        delete: jest.fn().mockResolvedValue(undefined),
        deleteAll: jest.fn().mockResolvedValue(undefined),
        history: jest.fn().mockResolvedValue([{ id: 'm1', memory: 'fact' }]),
        reset: jest.fn().mockResolvedValue(undefined),
    })),
}));

describe('Mem0Provider', () => {
    it('create() returns a Mem0Provider instance', () => {
        expect(create()).toBeInstanceOf(Mem0Provider);
    });

    it('manifest has correct type', () => {
        expect(manifest.type).toBe('memory');
    });

    it('add() returns results', async () => {
        const p = create();
        const result = await p.add([{ role: 'user', content: 'hello' }]);
        expect(result.results).toHaveLength(1);
    });

    it('search() returns results', async () => {
        const p = create();
        const result = await p.search('hello');
        expect(result.results[0].score).toBe(0.95);
    });

    it('getAll() returns results', async () => {
        const p = create();
        const result = await p.getAll();
        expect(result.results).toHaveLength(1);
    });

    it('get() returns a MemoryEntry', async () => {
        const p = create();
        const entry = await p.get('m1');
        expect(entry?.id).toBe('m1');
    });

    it('get() returns null on error', async () => {
        const { Memory } = require('mem0ai/oss');
        Memory.mockImplementationOnce(() => ({
            ...new Memory(),
            get: jest.fn().mockRejectedValue(new Error('not found')),
        }));
        const p = create();
        expect(await p.get('bad-id')).toBeNull();
    });

    it('delete() resolves', async () => {
        const p = create();
        await expect(p.delete('m1')).resolves.toBeUndefined();
    });

    it('deleteAll() resolves', async () => {
        const p = create();
        await expect(p.deleteAll()).resolves.toBeUndefined();
    });

    it('history() returns entries', async () => {
        const p = create();
        const h = await p.history('m1');
        expect(h).toHaveLength(1);
    });

    it('reset() resolves', async () => {
        const p = create();
        await expect(p.reset()).resolves.toBeUndefined();
    });
});
