sed -i 's/jest.advanceTimersByTime(30_001);/jest.runAllTimers();/g' tests/unit/services/ToolManager.test.ts
