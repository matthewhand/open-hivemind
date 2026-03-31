sed -i 's/jest.runAllTimers();/await jest.advanceTimersByTimeAsync(30001);/g' tests/unit/services/ToolManager.test.ts
