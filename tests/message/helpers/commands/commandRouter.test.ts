import { routeCommand } from '@src/message/helpers/commands/commandRouter';
import { handleStatusCommand } from '@src/message/helpers/commands/statusCommand';

jest.mock('@src/message/helpers/commands/statusCommand', () => ({
    handleStatusCommand: jest.fn(),
}));

describe('commandRouter', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should route !status command to handleStatusCommand', async () => {
        (handleStatusCommand as jest.Mock).mockResolvedValue('System is operational. All services are running smoothly.');

        const result = await routeCommand('!status');

        expect(handleStatusCommand).toHaveBeenCalledWith('');
        expect(result).toBe('System is operational. All services are running smoothly.');
    });

    it('should handle !status command with arguments gracefully', async () => {
        (handleStatusCommand as jest.Mock).mockResolvedValue('System is operational. All services are running smoothly.');

        const result = await routeCommand('!status extra arguments');

        expect(handleStatusCommand).toHaveBeenCalledWith('extra arguments');
        expect(result).toBe('System is operational. All services are running smoothly.');
    });

    it('should return unrecognized command message for unknown commands', async () => {
        const result = await routeCommand('!unknown');

        expect(handleStatusCommand).not.toHaveBeenCalled();
        expect(result).toBe('Unrecognized command: unknown');
    });

    it('should return null for empty command content', async () => {
        const result = await routeCommand('');

        expect(handleStatusCommand).not.toHaveBeenCalled();
        expect(result).toBeNull();
    });

    it('should return null for non-command messages', async () => {
        const result = await routeCommand('Hello there!');

        expect(handleStatusCommand).not.toHaveBeenCalled();
        expect(result).toBeNull();
    });
});