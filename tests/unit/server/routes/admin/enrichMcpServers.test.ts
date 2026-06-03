import {
  enrichConnectedMcpServers,
  type ConnectedMcpServer,
  type StoredMcpConfig,
} from '../../../../../src/server/routes/admin/enrichMcpServers';

function makeServer(overrides: Partial<ConnectedMcpServer> = {}): ConnectedMcpServer {
  return {
    name: 'server-a',
    connected: true,
    tools: [],
    toolCount: 0,
    lastConnected: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('enrichConnectedMcpServers', () => {
  it('merges stored config (serverUrl + description) onto the connected server', () => {
    const connected = [makeServer({ name: 'alpha', toolCount: 2 })];
    const stored: StoredMcpConfig[] = [
      { name: 'alpha', serverUrl: 'https://alpha.example', description: 'Alpha server' },
    ];

    const result = enrichConnectedMcpServers(connected, stored);

    expect(result).toEqual([
      {
        name: 'alpha',
        serverUrl: 'https://alpha.example',
        connected: true,
        tools: [],
        toolCount: 2,
        lastConnected: '2026-06-01T00:00:00.000Z',
        description: 'Alpha server',
      },
    ]);
  });

  it('falls back to `url` when `serverUrl` is absent', () => {
    const result = enrichConnectedMcpServers(
      [makeServer({ name: 'beta' })],
      [{ name: 'beta', url: 'https://beta.legacy' }]
    );

    expect(result[0].serverUrl).toBe('https://beta.legacy');
  });

  it('prefers `serverUrl` over `url` when both are present', () => {
    const result = enrichConnectedMcpServers(
      [makeServer({ name: 'gamma' })],
      [{ name: 'gamma', serverUrl: 'https://primary', url: 'https://legacy' }]
    );

    expect(result[0].serverUrl).toBe('https://primary');
  });

  it('defaults serverUrl and description to empty strings when no stored config matches', () => {
    const result = enrichConnectedMcpServers([makeServer({ name: 'orphan' })], []);

    expect(result[0].serverUrl).toBe('');
    expect(result[0].description).toBe('');
  });

  it('preserves connection metadata even without a stored match', () => {
    const result = enrichConnectedMcpServers(
      [makeServer({ name: 'orphan', connected: false, toolCount: 5 })],
      [{ name: 'someone-else' }]
    );

    expect(result[0]).toMatchObject({ name: 'orphan', connected: false, toolCount: 5 });
  });

  it('returns an empty array when there are no connected servers', () => {
    expect(enrichConnectedMcpServers([], [{ name: 'alpha', serverUrl: 'x' }])).toEqual([]);
  });

  it('keeps the FIRST stored config on duplicate names (matching .find() semantics)', () => {
    const result = enrichConnectedMcpServers(
      [makeServer({ name: 'dup' })],
      [
        { name: 'dup', serverUrl: 'https://first' },
        { name: 'dup', serverUrl: 'https://second' },
      ]
    );

    expect(result[0].serverUrl).toBe('https://first');
  });

  it('enriches each connected server independently against the shared index', () => {
    const connected = [
      makeServer({ name: 'one' }),
      makeServer({ name: 'two' }),
      makeServer({ name: 'three' }),
    ];
    const stored: StoredMcpConfig[] = [
      { name: 'one', serverUrl: 'https://one' },
      { name: 'three', description: 'the third' },
    ];

    const result = enrichConnectedMcpServers(connected, stored);

    expect(result.map((s) => s.serverUrl)).toEqual(['https://one', '', '']);
    expect(result.map((s) => s.description)).toEqual(['', '', 'the third']);
  });

  it('treats empty-string stored serverUrl as missing and falls back', () => {
    const result = enrichConnectedMcpServers(
      [makeServer({ name: 'delta' })],
      [{ name: 'delta', serverUrl: '', url: 'https://fallback' }]
    );

    expect(result[0].serverUrl).toBe('https://fallback');
  });

  it('does not mutate the input arrays or their elements', () => {
    const connected = [makeServer({ name: 'imm' })];
    const stored: StoredMcpConfig[] = [{ name: 'imm', serverUrl: 'https://imm' }];
    const connectedSnapshot = JSON.parse(JSON.stringify(connected));
    const storedSnapshot = JSON.parse(JSON.stringify(stored));

    enrichConnectedMcpServers(connected, stored);

    expect(connected).toEqual(connectedSnapshot);
    expect(stored).toEqual(storedSnapshot);
  });
});
