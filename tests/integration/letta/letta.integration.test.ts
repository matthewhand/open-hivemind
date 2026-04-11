/**
 * Letta Integration Tests
 *
 * Requires a running Letta server and LETTA_SERVER_PASSWORD set.
 * Skipped automatically in CI where credentials are not available.
 *
 * Setup: docker compose up -d letta
 * Run:   LETTA_SERVER_PASSWORD=... npx jest tests/integration/letta/letta.integration.test.ts
 */

import Letta from '@letta-ai/letta-client';

const LETTA_BASE_URL = process.env.LETTA_BASE_URL || 'http://localhost:8283';
const LETTA_PASSWORD = process.env.LETTA_SERVER_PASSWORD;

const describeIfLetta = LETTA_PASSWORD ? describe : describe.skip;

describeIfLetta('Letta integration', () => {
  let client: InstanceType<typeof Letta>;

  beforeAll(() => {
    client = new Letta({ baseURL: LETTA_BASE_URL, apiKey: LETTA_PASSWORD });
  });

  it('health endpoint returns ok', async () => {
    const res = await fetch(`${LETTA_BASE_URL}/v1/health/`);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('lists agents', async () => {
    const agents = [];
    for await (const a of client.agents.list({ limit: 5 })) {
      agents.push(a);
    }
    expect(Array.isArray(agents)).toBe(true);
  });

  it('creates agent, sends message, deletes agent', async () => {
    // Find an available LLM model
    const res = await fetch(`${LETTA_BASE_URL}/v1/models/`, {
      headers: { Authorization: `Bearer ${LETTA_PASSWORD}` },
    });
    const models = (await res.json()) as Array<{ handle: string; model_type: string }>;
    const llm = models.find((m) => m.model_type === 'llm' && !m.handle.startsWith('letta/'))
      || models.find((m) => m.model_type === 'llm');
    if (!llm) {
      console.warn('No LLM models available on Letta server, skipping');
      return;
    }

    // Find an embedding model (fall back to letta-free)
    const embedding = models.find((m) => m.model_type === 'embedding');
    const embeddingHandle = embedding?.handle || 'letta/letta-free';

    const agent = await client.agents.create({
      model: llm.handle,
      embedding: embeddingHandle,
      memory_blocks: [
        { label: 'human', value: 'Name: Integration Test' },
        { label: 'persona', value: 'I am a test agent.' },
      ],
    });
    expect(agent.id).toMatch(/^agent-/);

    try {
      const response = await client.agents.messages.create(agent.id, {
        input: 'Reply with exactly: INTEGRATION_OK',
      });
      expect(response.messages.length).toBeGreaterThan(0);
    } finally {
      await client.agents.delete(agent.id);
    }
  }, 30000);
});
