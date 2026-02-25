import Logger from '@common/logger';
import StartupLegendService from '../../src/services/StartupLegendService';

// Mock the Logger module
jest.mock('@common/logger', () => {
  const mockDebug = jest.fn();
  return {
    __esModule: true,
    default: {
      withContext: jest.fn().mockReturnValue({
        debug: mockDebug,
      }),
      // Expose the mock function so we can assert on it
      mockDebug,
    },
  };
});

describe('StartupLegendService', () => {
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    // Clear the mock calls
    (Logger as any).mockDebug.mockClear();

    // Spy on console.info and suppress output to keep test results clean
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.info
    consoleInfoSpy.mockRestore();
  });

  it('should print the startup legend correctly', () => {
    StartupLegendService.printLegend();

    // Verify that console.info was called
    expect(consoleInfoSpy).toHaveBeenCalled();

    // Check for specific content in the output to ensure the legend is printed
    const calls = consoleInfoSpy.mock.calls.map((call) => call[0]);
    expect(calls.some((c) => c.includes('PROBABILITY MODIFIERS LEGEND'))).toBe(true);
    expect(calls.some((c) => c.includes('Base'))).toBe(true);
    expect(calls.some((c) => c.includes('Recent'))).toBe(true);
    expect(calls.some((c) => c.includes('UserDensity'))).toBe(true);
    expect(calls.some((c) => c.includes('BotRatio'))).toBe(true);

    // Verify that the logger logged the completion message
    expect((Logger as any).mockDebug).toHaveBeenCalledWith('Startup legend printed');
  });
});
