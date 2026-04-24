import 'reflect-metadata';
import { DatabaseManager } from '../src/database/DatabaseManager';
import { MemoryRepository } from '../src/database/repositories/MemoryRepository';
import * as crypto from 'crypto';

async function benchmark(mode: string, config: any) {
  console.log(`\n--- Benchmarking Mode: ${mode} ---`);
  
  // Reset instance
  (DatabaseManager as any).instance = null;
  const dbManager = DatabaseManager.getInstance(config);
  await dbManager.connect();

  const isPg = config.type === 'postgres';
  // @ts-ignore
  const repo = new MemoryRepository(() => dbManager.db, () => dbManager.isConnected(), () => isPg);

  const embedding = new Array(1536).fill(0.1).map(() => Math.random());
  
  // 1. Benchmark Write
  const startAdd = performance.now();
  await repo.addMemory({
    content: `Benchmark memory ${crypto.randomUUID()}`,
    embedding
  });
  const endAdd = performance.now();
  console.log(`Add Memory Latency: ${(endAdd - startAdd).toFixed(2)}ms`);

  // 2. Benchmark Search
  // Ensure we have at least 10 rows for a realistic scan
  for(let i=0; i<10; i++) {
     await repo.addMemory({ content: 'filler', embedding });
  }

  const startSearch = performance.now();
  const results = await repo.searchMemories(embedding, { limit: 5 });
  const endSearch = performance.now();
  console.log(`Search Memory Latency (${isPg ? 'Native' : 'JS-Scan'}): ${(endSearch - startSearch).toFixed(2)}ms`);
  console.log(`Results Found: ${results.length}`);

  await dbManager.disconnect();
}

async function runAll() {
  try {
    // 1. LITE (SQLite Memory)
    await benchmark('LITE (SQLite Memory)', { type: 'sqlite', path: ':memory:' });

    // 2. STANDARD (SQLite Disk)
    await benchmark('STANDARD (SQLite Disk)', { type: 'sqlite', path: 'data/benchmark.db' });

    // 3. CLOUD (Postgres/Neon)
    if (process.env.DATABASE_URL) {
       await benchmark('CLOUD (Postgres/Neon)', { type: 'postgres' });
    } else {
       console.log('\n--- CLOUD (Postgres/Neon) Skipped: DATABASE_URL not in env ---');
    }
  } catch (e) {
    console.error('Benchmark failed:', e);
  }
}

runAll();
