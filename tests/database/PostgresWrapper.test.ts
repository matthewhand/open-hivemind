import { Pool } from 'pg';
import { PostgresWrapper } from '../../src/database/postgresWrapper';

jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('PostgresWrapper', () => {
  let wrapper: PostgresWrapper;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = new Pool();
    wrapper = new PostgresWrapper('postgres://user:pass@host:5432/db');
  });

  it('should translate ? to $n in SQL', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await wrapper.all('SELECT * FROM users WHERE id = ? AND name = ?', [1, 'test']);

    expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1 AND name = $2', [
      1,
      'test',
    ]);
  });

  it('should add RETURNING id to INSERT statements in run()', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 123 }], rowCount: 1 });
    const result = await wrapper.run('INSERT INTO users (name) VALUES (?)', ['test']);

    expect(mockPool.query).toHaveBeenCalledWith(
      'INSERT INTO users (name) VALUES ($1) RETURNING id',
      ['test']
    );
    expect(result.lastID).toBe(123);
  });

  it('should not add RETURNING id if already present', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 123 }], rowCount: 1 });
    await wrapper.run('INSERT INTO users (name) VALUES (?) RETURNING id', ['test']);

    expect(mockPool.query).toHaveBeenCalledWith(
      'INSERT INTO users (name) VALUES ($1) RETURNING id',
      ['test']
    );
  });

  it('should execute get() correctly', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'test' }] });
    const result = await wrapper.get('SELECT * FROM users WHERE id = ?', [1]);

    expect(result).toEqual({ id: 1, name: 'test' });
    expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
  });

  it('should execute exec() correctly', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    await wrapper.exec('CREATE TABLE test (id SERIAL)');

    expect(mockPool.query).toHaveBeenCalledWith('CREATE TABLE test (id SERIAL)');
  });
});
