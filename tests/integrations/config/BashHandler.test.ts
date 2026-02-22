import BashHandler from '@src/integrations/config/BashHandler';
import 'jest';

describe('BashHandler', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console.log and mock its implementation to keep test output clean
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    // Restore the original console.log implementation
    consoleLogSpy.mockRestore();
  });

  it('should log "BashHandler initialized" when created', () => {
    new BashHandler();
    expect(consoleLogSpy).toHaveBeenCalledWith('BashHandler initialized');
  });

  it('should log correctly when handleCommand is called', () => {
    const handler = new BashHandler();
    const command = 'echo hello';
    handler.handleCommand(command);
    // Note: The constructor also calls console.log, so we check if it was called with the command message
    expect(consoleLogSpy).toHaveBeenCalledWith(`Handling command with Bash: ${command}`);
  });
});
