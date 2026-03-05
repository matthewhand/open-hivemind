import { routeCommand } from '@src/message/helpers/commands/commandRouter';
import { handleStatusCommand } from '@src/message/helpers/commands/statusCommand';

jest.mock('@src/message/helpers/commands/statusCommand', () => ({
  handleStatusCommand: jest.fn(),
}));

describe('commandRouter', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should route commands correctly', async () => {
    // Route !status command
    (handleStatusCommand as jest.Mock).mockResolvedValue(
      'System is operational. All services are running smoothly.'
    );

    let result = await routeCommand('!status');

    expect(handleStatusCommand).toHaveBeenCalledWith([]);
    expect(result).toBe('System is operational. All services are running smoothly.');

    // Handle !status with arguments
    result = await routeCommand('!status extra arguments');

    expect(handleStatusCommand).toHaveBeenCalledWith(['extra', 'arguments']);
    expect(result).toBe('System is operational. All services are running smoothly.');

    // Return unrecognized for unknown commands
    jest.clearAllMocks();
    result = await routeCommand('!unknown');

    expect(handleStatusCommand).not.toHaveBeenCalled();
    expect(result).toBe('Unrecognized command: unknown');

    // Return null for empty content
    result = await routeCommand('');

    expect(handleStatusCommand).not.toHaveBeenCalled();
    expect(result).toBeNull();

    // Return null for non-command messages
    result = await routeCommand('Hello there!');

    expect(handleStatusCommand).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  describe('negative tests', () => {
    it('should handle negative cases', async () => {
      // Handle permission errors
      (handleStatusCommand as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      let result = await routeCommand('!status');

      expect(result).toBe('Error: Permission denied');

      // Handle malformed commands
      const malformedCommands = ['!', '!!status', '!status:', '!status::action'];

      for (const cmd of malformedCommands) {
        result = await routeCommand(cmd);
        expect(result === null || typeof result === 'string').toBe(true);
      }

      // Handle very long command names
      const longCommand = '!' + 'a'.repeat(1000);
      result = await routeCommand(longCommand);

      expect(result).toContain('Unrecognized command');

      // Handle special characters
      const specialCommands = ['!status@#$', '!status\n\t', '!status<script>'];

      for (const cmd of specialCommands) {
        result = await routeCommand(cmd);
        expect(typeof result).toBe('string');
      }
    });
  });

  describe('complex command handling', () => {
    it('should handle complex commands', async () => {
      // Handle commands with multiple arguments
      (handleStatusCommand as jest.Mock).mockResolvedValue('OK');

      let result = await routeCommand('!status verbose json');

      expect(handleStatusCommand).toHaveBeenCalledWith(['verbose', 'json']);
      expect(result).toBe('OK');

      // Handle commands with actions
      result = await routeCommand('!deploy:start production --force');

      expect(result).toBe('Unrecognized command: deploy');
    });
  });

  describe('telemetry validation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should track command handler success and failure', async () => {
      (handleStatusCommand as jest.Mock).mockResolvedValue('Telemetry success');

      const successResult = await routeCommand('!status');
      expect(handleStatusCommand).toHaveBeenCalledTimes(1);
      expect(successResult).toBe('Telemetry success');

      (handleStatusCommand as jest.Mock).mockRejectedValue(new Error('Telemetry failure'));
      const failureResult = await routeCommand('!status');
      expect(handleStatusCommand).toHaveBeenCalledTimes(2);
      expect(failureResult).toBe('Error: Telemetry failure');
    });
  });
});
