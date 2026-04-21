#!/bin/bash

# Re-fix the MessageEnvelope issue correctly with right filepath
sed -i "s/interface MessageEnvelope {/interface MessageEnvelope {\n  id?: string;\n  channelId?: string;/g" src/types/messages.ts

# For analytics test
sed -i "s/import { WebSocketService } from '\.\.\/server\/services\/WebSocketService';/import { WebSocketService } from '\.\.\/server\/services\/websocket\/WebSocketService';/g" tests/services/analytics/AnalyticsCalculator.test.ts

# The compiler error is inside AnalyticsCalculator.ts which was importing from wrong location
sed -i "s/import { WebSocketService } from '\.\.\/server\/services\/WebSocketService';/import { WebSocketService } from '\.\.\/server\/services\/websocket\/WebSocketService';/g" src/services/analytics/AnalyticsCalculator.ts
