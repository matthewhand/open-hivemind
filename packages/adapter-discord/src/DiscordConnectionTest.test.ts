import { testDiscordConnection } from './DiscordConnectionTest';

describe('DiscordConnectionTest', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return error if no token provided', async () => {
    const result = await testDiscordConnection('');
    expect(result.ok).toBe(false);
    expect(result.message).toBe('Discord bot token is required');
  });

  it('should return error if token is only whitespace', async () => {
    const result = await testDiscordConnection('   ');
    expect(result.ok).toBe(false);
    expect(result.message).toBe('Discord bot token is required');
  });

  it('should throw error if fetch fails (network error)', async () => {
    fetchSpy.mockRejectedValue(new Error('Network error'));

    await expect(testDiscordConnection('token')).rejects.toThrow('Network error');
  });

  it('should return error if response is not ok', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: jest.fn().mockResolvedValue('{"message": "401: Unauthorized"}'),
      json: jest.fn(),
      headers: new Headers(),
    } as unknown as Response);

    const result = await testDiscordConnection('invalid-token');
    expect(result.ok).toBe(false);
    expect(result.message).toBe('Discord API error: 401 Unauthorized');
    expect(result.details).toEqual({ body: '{"message": "401: Unauthorized"}' });

    expect(fetchSpy).toHaveBeenCalledWith('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: 'Bot invalid-token' },
    });
  });

  it('should return success if response is ok', async () => {
    const mockData = { id: '123', username: 'TestBot' };
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockData),
      headers: new Headers(),
    } as unknown as Response);

    const result = await testDiscordConnection('valid-token');
    expect(result.ok).toBe(true);
    expect(result.message).toBe('Connected as TestBot (123)');
    expect(result.details).toEqual(mockData);

    expect(fetchSpy).toHaveBeenCalledWith('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: 'Bot valid-token' },
    });
  });
});
