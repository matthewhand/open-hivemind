import { testMonitor } from './tests/helpers/testExecutionMonitor';

testMonitor.startSuite('suite1');
// No tests
testMonitor.endSuite();

try {
  console.log(testMonitor.getPerformanceSummary());
} catch(e) {
  console.error("Error generating insights with 0 tests", e);
}
