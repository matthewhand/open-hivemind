sed -i "s/return \[{ name: 'tool-a1', description: 'A1', inputSchema: {} }\];/return \[{ name: 'tool-a1', description: 'A1', inputSchema: {}, serverName: 'server-a' }\];/g" tests/unit/services/ToolManager.test.ts
sed -i "s/return \[{ name: 'tool-b1', description: 'B1', inputSchema: {} }\];/return \[{ name: 'tool-b1', description: 'B1', inputSchema: {}, serverName: 'server-b' }\];/g" tests/unit/services/ToolManager.test.ts
sed -i "s/{ name: 'tool-p1', description: 'P1', inputSchema: {} }/{ name: 'tool-p1', description: 'P1', inputSchema: {}, serverName: 'server-p' }/g" tests/unit/services/ToolManager.test.ts
sed -i "s/it('returns timeout error when tool exceeds timeout', async () => {/it('returns timeout error when tool exceeds timeout', async () => {\n      jest.useRealTimers();/g" tests/unit/services/ToolManager.test.ts
sed -i "s/jest.advanceTimersByTime(30005);/await new Promise(r => setTimeout(r, 100));/g" tests/unit/services/ToolManager.test.ts
