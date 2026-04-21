#!/bin/bash

# Fix createLogger import
sed -i "s/import { createLogger } from '..\/common\/logger';/import { createLogger } from '..\/..\/common\/StructuredLogger';/g" src/server/services/BotStressTestService.ts
sed -i "s/import { createLogger } from '..\/common\/logger';/import { createLogger } from '..\/..\/common\/StructuredLogger';/g" src/server/services/BotBenchmarkService.ts
