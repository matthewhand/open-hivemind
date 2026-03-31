sed -i 's/await jest.advanceTimersByTimeAsync(30001);/jest.runOnlyPendingTimers();/g' tests/unit/services/ToolManager.test.ts
