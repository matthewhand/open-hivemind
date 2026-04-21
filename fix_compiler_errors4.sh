#!/bin/bash

# Fix the MessageEnvelope issue correctly with right filepath
sed -i "s/export interface MessageEnvelope {/export interface MessageEnvelope {\n  id?: string;\n  channelId?: string;\n  ackTimestamp?: number;/g" src/types/websocket.ts
