import { ConfigurationImportExportService } from '../../src/server/services/ConfigurationImportExportService';
import { DatabaseManager } from '../../src/database/DatabaseManager';

// Mock the DatabaseManager instance
const dbManager = DatabaseManager.getInstance();

// Mock getBotConfiguration to simulate latency (e.g. 5ms per query)
let queryCount = 0;
dbManager.getBotConfiguration = async (id: number) => {
  queryCount++;
  // Simulate network/db latency of 2ms
  await new Promise(resolve => setTimeout(resolve, 2));
  return {
    id: 1,
    name: 'Test Bot',
    messageProvider: 'discord',
    llmProvider: 'openai',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

// Mock createBotConfigurationVersion
dbManager.createBotConfigurationVersion = async (version: any) => {
  return 1;
};

// Override the DB manager inside the service
const service = ConfigurationImportExportService.getInstance();
(service as any).dbManager = dbManager;

// Create dummy import data with 1000 versions pointing to the same configId
const importData = {
  configurations: [
    {
      id: 1,
      name: 'Test Bot',
      messageProvider: 'discord',
      llmProvider: 'openai'
    }
  ],
  versions: Array.from({ length: 1000 }).map((_, i) => ({
    botConfigurationId: 1,
    version: `1.${i}.0`,
    name: `Test Bot Version ${i}`,
    messageProvider: 'discord',
    llmProvider: 'openai',
    isActive: true,
    createdAt: new Date(),
  }))
};

// Write dummy data to a temp file
import { writeFileSync, unlinkSync } from 'fs';
const tempFile = 'scripts/benchmarks/temp-import-bench.json';
writeFileSync(tempFile, JSON.stringify(importData));

async function runBenchmark() {
  console.log('Running benchmark for importing 1000 versions...');
  const start = Date.now();

  await service.importConfigurations(tempFile, { format: 'json', overwrite: true });

  const end = Date.now();
  console.log(`Execution time: ${end - start} ms`);
  console.log(`Number of getBotConfiguration queries: ${queryCount}`);

  unlinkSync(tempFile);
}

runBenchmark().catch(console.error);
// NOTE: This is a standalone benchmark script to measure the N+1 optimization.
// It runs independently and temporarily mocks out the database manager.
