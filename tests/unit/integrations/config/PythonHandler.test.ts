import PythonHandler from '../../../../src/integrations/config/PythonHandler';

describe('PythonHandler', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock console.log to suppress output during tests
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should initialize correctly', () => {
    new PythonHandler();
    expect(consoleSpy).toHaveBeenCalledWith('PythonHandler initialized');
  });

  it('should handle command correctly', () => {
    const handler = new PythonHandler();
    const command = 'print("Hello World")';
    handler.handleCommand(command);
    expect(consoleSpy).toHaveBeenCalledWith(`Handling command with Python: ${command}`);
  });
});
