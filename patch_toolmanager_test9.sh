sed -i "s/it('returns timeout error when tool exceeds timeout', async () => {/it('returns timeout error when tool exceeds timeout', async () => {\n      jest.useRealTimers();/g" tests/unit/services/ToolManager.test.ts
sed -i "s/jest.advanceTimersByTime(30005);/await new Promise(r => setTimeout(r, 100));/g" tests/unit/services/ToolManager.test.ts
