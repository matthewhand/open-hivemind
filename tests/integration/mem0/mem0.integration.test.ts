/**
 * Mem0 Integration Tests
 *
 * Requires a running Mem0 stack (API + Postgres + Neo4j) and optionally an LLM key.
 * Skipped automatically when MEM0_BASE_URL is not reachable.
 *
 * Setup: docker compose up -d mem0 mem0-postgres mem0-neo4j
 * Run:   npx jest tests/integration/mem0/mem0.integration.test.ts
 */

const MEM0_BASE_URL = process.env.MEM0_BASE_URL || 'http://localhost:8888';
const MEM0_API_KEY = process.env.MEM0_API_KEY || '';
const TEST_USER_ID = 'integration-test-user';

let mem0Available = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${MEM0_BASE_URL}/`, {
      redirect: 'follow',
      signal: AbortSignal.timeout(3000),
    });
    mem0Available = res.ok;
  } catch {
    mem0Available = false;
  }
});

const describeIfMem0 = () => (mem0Available ? describe : describe.skip);

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (MEM0_API_KEY) h['Authorization'] = `Token ${MEM0_API_KEY}`;
  return h;
}

describe('Mem0 integration', () => {
  // Use a factory so the skip decision happens after beforeAll
  it('infrastructure: API docs reachable', async () => {
    if (!mem0Available) return;
    const res = await fetch(`${MEM0_BASE_URL}/`, { redirect: 'follow' });
    expect(res.ok).toBe(true);
  });

  it('infrastructure: OpenAPI schema served', async () => {
    if (!mem0Available) return;
    const res = await fetch(`${MEM0_BASE_URL}/openapi.json`);
    expect(res.ok).toBe(true);
    const schema = await res.json();
    expect(schema.paths).toBeDefined();
    expect(schema.paths['/memories']).toBeDefined();
    expect(schema.paths['/search']).toBeDefined();
  });

  it('list memories returns array (even when empty)', async () => {
    if (!mem0Available) return;
    const res = await fetch(`${MEM0_BASE_URL}/memories?user_id=${TEST_USER_ID}`, {
      headers: headers(),
    });
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe('Mem0 CRUD', () => {
  let memoryId: string | null = null;

  it('add memory', async () => {
    if (!mem0Available) return;
    const res = await fetch(`${MEM0_BASE_URL}/memories`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'My favourite language is TypeScript.' },
          { role: 'assistant', content: 'Noted! You prefer TypeScript.' },
        ],
        user_id: TEST_USER_ID,
      }),
    });

    if (res.status === 500) {
      // LLM key not configured — skip remaining CRUD
      console.warn('Mem0 add returned 500 (likely no LLM key configured), skipping CRUD');
      return;
    }

    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body.results).toBeDefined();
    if (body.results.length > 0) {
      memoryId = body.results[0].id;
    }
  }, 30000);

  it('search memories', async () => {
    if (!mem0Available) return;
    const res = await fetch(`${MEM0_BASE_URL}/search`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        query: 'What programming language?',
        user_id: TEST_USER_ID,
      }),
    });

    // 500 = no LLM key, acceptable
    if (res.status === 500) return;
    expect(res.ok).toBe(true);
  }, 30000);

  it('get single memory', async () => {
    if (!mem0Available || !memoryId) return;
    const res = await fetch(`${MEM0_BASE_URL}/memories/${memoryId}`, { headers: headers() });
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body.id).toBe(memoryId);
  });

  it('delete memory (cleanup)', async () => {
    if (!mem0Available || !memoryId) return;
    const res = await fetch(`${MEM0_BASE_URL}/memories/${memoryId}`, {
      method: 'DELETE',
      headers: headers(),
    });
    expect([200, 204]).toContain(res.status);
  });
});
