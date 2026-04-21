#!/bin/bash

# Fix message:error and message:response events
sed -i 's/MessageContext & { responseText: string; }/MessageContext \& { responseText: string; [key: string]: unknown }/g' src/server/services/BotStressTestService.ts
sed -i 's/MessageContext & { error: Error; stage: string; }/MessageContext \& { error: Error; stage: string; [key: string]: unknown }/g' src/server/services/BotStressTestService.ts

# Fix createLogger import
sed -i "1i import { createLogger } from '../common/logger';" src/server/services/BotStressTestService.ts
sed -i "1i import { createLogger } from '../common/logger';" src/server/services/BotBenchmarkService.ts

# Fix duplicate BotInstance
sed -i "s/import type { BotInstance } from '..\/types';/import type { BotInstance as TypesBotInstance } from '..\/types';/g" src/server/services/BotBenchmarkService.ts

# Fix MessageEnvelope ID and channelId
sed -i "s/interface MessageEnvelope {/interface MessageEnvelope {\n  id?: string;\n  channelId?: string;/g" src/server/services/websocket/MessageDeliveryTracker.ts
sed -i "s/DeliveryStatus.DELIVERED/'DELIVERED'/g" src/server/services/websocket/MessageDeliveryTracker.ts
sed -i "s/ackTimestamp/timestamp/g" src/server/services/websocket/MessageDeliveryTracker.ts

# Fix missing imports in routes/bots.ts
sed -i "1i import { BotInsightsService } from '../services/BotInsightsService';" src/server/routes/bots.ts
sed -i "1i import { BotBenchmarkService } from '../services/BotBenchmarkService';" src/server/routes/bots.ts
sed -i "1i import { BotStressTestService } from '../services/BotStressTestService';" src/server/routes/bots.ts
