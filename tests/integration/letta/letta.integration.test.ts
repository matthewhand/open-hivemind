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

const MEMORY_TOOL_NAMES = [
  'memory_replace',
  'memory_insert',
  'core_memory_replace',
  'core_memory_append',
];

async function resolveModels(): Promise<{ llm: string; embedding: string } | null> {
  const res = await fetch(`${LETTA_BASE_URL}/v1/models/`, {
    headers: { Authorization: `Bearer ${LETTA_PASSWORD}` },
  });
  const models = (await res.json()) as Array<{ handle: string; model_type: string }>;
  // Prefer free-tier proxy models, then any non-letta model, then any model
  const llm =
    models.find((m) => m.model_type === 'llm' && m.handle.includes('free-small')) ||
    models.find((m) => m.model_type === 'llm' && !m.handle.startsWith('letta/')) ||
    models.find((m) => m.model_type === 'llm');
  if (!llm) return null;
  const embedding = models.find((m) => m.model_type === 'embedding');
  return { llm: llm.handle, embedding: embedding?.handle || 'letta/letta-free' };
}

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
    const models = await resolveModels();
    if (!models) return console.warn('No LLM models available, skipping');

    const agent = await client.agents.create({
      model: models.llm,
      embedding: models.embedding,
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

describeIfLetta('Letta memory', () => {
  let client: InstanceType<typeof Letta>;
  let agentId: string;

  beforeAll(async () => {
    client = new Letta({ baseURL: LETTA_BASE_URL, apiKey: LETTA_PASSWORD });
    const models = await resolveModels();
    if (!models) throw new Error('No LLM models available');

    const agent = await client.agents.create({
      model: models.llm,
      embedding: models.embedding,
      memory_blocks: [
        { label: 'human', value: 'Name: Unknown' },
        {
          label: 'persona',
          value: 'I am a helpful assistant. I always update my memory when I learn new facts.',
        },
      ],
    });
    agentId = agent.id;
  });

  afterAll(async () => {
    if (agentId) await client.agents.delete(agentId);
  });

  it('emits memory tool calls and successful returns when given new facts', async () => {
    const response = await client.agents.messages.create(agentId, {
      input:
        'IMPORTANT: My name is Alice. I have a cat named Whiskers. Please save this to your memory.',
    });

    // Check for memory tool calls OR verify the block was updated (model may batch internally)
    const toolCalls = response.messages.filter(
      (m: any) =>
        m.message_type === 'tool_call_message' && MEMORY_TOOL_NAMES.includes(m.tool_call?.name)
    );
    const successReturns = response.messages.filter(
      (m: any) => m.message_type === 'tool_return_message' && m.status === 'success'
    );

    // Either tool calls were emitted, or we verify memory was updated via blocks API
    if (toolCalls.length > 0) {
      expect(successReturns.length).toBeGreaterThan(0);
    } else {
      // Model may have updated memory without explicit tool call messages in some versions
      const blocks: any[] = [];
      for await (const b of client.agents.blocks.list(agentId)) blocks.push(b);
      const humanBlock = blocks.find((b: any) => b.label === 'human');
      expect(humanBlock.value).not.toBe('Name: Unknown');
    }
  }, 30000);

  it('memory blocks reflect updated facts via blocks API', async () => {
    const blocks: any[] = [];
    for await (const b of client.agents.blocks.list(agentId)) {
      blocks.push(b);
    }
    const humanBlock = blocks.find((b: any) => b.label === 'human');
    expect(humanBlock).toBeDefined();
    // Agent should have updated the block from "Name: Unknown" to something containing the facts
    expect(humanBlock.value).not.toBe('Name: Unknown');
  }, 10000);

  it('recalls facts from memory in subsequent messages', async () => {
    const response = await client.agents.messages.create(agentId, {
      input: "What's my name and what pet do I have?",
    });

    const assistantMsg = response.messages.find(
      (m: any) => m.message_type === 'assistant_message' && m.content
    ) as any;
    expect(assistantMsg).toBeDefined();

    const content = assistantMsg.content.toLowerCase();
    expect(content).toContain('alice');
    expect(content).toMatch(/whiskers|cat/);
  }, 30000);
});
