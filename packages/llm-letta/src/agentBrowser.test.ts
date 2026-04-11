jest.mock('dns', () => ({
  promises: { lookup: jest.fn().mockResolvedValue({ address: '1.2.3.4', family: 4 }) },
}));

import { listAgents, getAgent } from './agentBrowser';

jest.mock('@hivemind/shared-types', () => {
  const actual = jest.requireActual('@hivemind/shared-types');
  return { ...actual, isSafeUrl: jest.fn().mockResolvedValue(true) };
});

const mockAgentsList = jest.fn();
const mockAgentsRetrieve = jest.fn();

jest.mock('@letta-ai/letta-client', () =>
  jest.fn().mockImplementation(() => ({
    agents: { list: mockAgentsList, retrieve: mockAgentsRetrieve },
  }))
);

beforeEach(() => jest.clearAllMocks());

const AGENT = { id: 'a1', name: 'TestAgent', description: 'desc', created_at: '2024-01-01', updated_at: '2024-01-02' };

describe('listAgents', () => {
  it('returns array of agent summaries', async () => {
    mockAgentsList.mockResolvedValue([AGENT]);
    const result = await listAgents('api-key');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'a1', name: 'TestAgent' });
  });

  it('handles data envelope shape', async () => {
    mockAgentsList.mockResolvedValue({ data: [AGENT] });
    const result = await listAgents('api-key');
    expect(result[0].id).toBe('a1');
  });

  it('uses custom apiUrl', async () => {
    mockAgentsList.mockResolvedValue([AGENT]);
    const Letta = require('@letta-ai/letta-client');
    await listAgents('api-key', 'https://custom.letta.com/v1');
    expect(Letta).toHaveBeenCalledWith(expect.objectContaining({ baseURL: 'https://custom.letta.com/v1' }));
  });

  it('throws on SSRF unsafe URL', async () => {
    const { isSafeUrl } = require('@hivemind/shared-types');
    isSafeUrl.mockResolvedValueOnce(false);
    await expect(listAgents('key', 'http://localhost/v1')).rejects.toThrow('not safe');
  });
});

describe('getAgent', () => {
  it('returns agent summary', async () => {
    mockAgentsRetrieve.mockResolvedValue(AGENT);
    const result = await getAgent('a1', 'api-key');
    expect(result).toMatchObject({ id: 'a1', name: 'TestAgent' });
  });

  it('throws on SSRF unsafe URL', async () => {
    const { isSafeUrl } = require('@hivemind/shared-types');
    isSafeUrl.mockResolvedValueOnce(false);
    await expect(getAgent('a1', 'key', 'http://localhost/v1')).rejects.toThrow('not safe');
  });
});
