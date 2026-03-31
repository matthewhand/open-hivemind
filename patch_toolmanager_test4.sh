sed -i 's/jest.runOnlyPendingTimers();/await jest.advanceTimersByTimeAsync(30001);/g' tests/unit/services/ToolManager.test.ts
sed -i "s/it('returns timeout error when tool exceeds timeout', async () => {/it('returns timeout error when tool exceeds timeout', async () => {\n      jest.useFakeTimers();/g" tests/unit/services/ToolManager.test.ts
