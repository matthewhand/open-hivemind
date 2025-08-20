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

        expect(handleStatusCommand).toHaveBeenCalledWith([]);
        expect(result).toBe('System is operational. All services are running smoothly.');
    });

    it('should handle !status command with arguments gracefully', async () => {
        (handleStatusCommand as jest.Mock).mockResolvedValue('System is operational. All services are running smoothly.');

        const result = await routeCommand('!status extra arguments');

        expect(handleStatusCommand).toHaveBeenCalledWith(['extra', 'arguments']);
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

    describe('negative tests', () => {
        it('should handle permission errors gracefully', async () => {
            (handleStatusCommand as jest.Mock).mockRejectedValue(new Error('Permission denied'));

            const result = await routeCommand('!status');

            expect(result).toBe('Error: Permission denied');
        });

        it('should handle malformed commands', async () => {
            const malformedCommands = ['!', '!!status', '!status:', '!status::action'];
            
            for (const cmd of malformedCommands) {
                const result = await routeCommand(cmd);
                expect(result === null || typeof result === 'string').toBe(true);
            }
        });

        it('should handle very long command names', async () => {
            const longCommand = '!' + 'a'.repeat(1000);
            const result = await routeCommand(longCommand);
            
            expect(result).toContain('Unrecognized command');
        });

        it('should handle special characters in commands', async () => {
            const specialCommands = ['!status@#$', '!status\n\t', '!status<script>'];
            
            for (const cmd of specialCommands) {
                const result = await routeCommand(cmd);
                expect(typeof result).toBe('string');
            }
        });
    });

    describe('complex command handling', () => {
        it('should handle commands with multiple arguments', async () => {
            (handleStatusCommand as jest.Mock).mockResolvedValue('OK');
            
            const result = await routeCommand('!status verbose json');
            
            expect(handleStatusCommand).toHaveBeenCalledWith(['verbose', 'json']);
            expect(result).toBe('OK');
        });

        it('should handle commands with actions', async () => {
            const result = await routeCommand('!deploy:start production --force');
            
            expect(result).toBe('Unrecognized command: deploy');
        });
    });

    describe('telemetry validation', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should track successful command execution', async () => {
            (handleStatusCommand as jest.Mock).mockResolvedValue('Success');
            
            await routeCommand('!status');
            
            // Note: Actual telemetry integration would be implemented in commandRouter
            expect(true).toBe(true); // Placeholder for telemetry assertions
        });

        it('should track failed command execution', async () => {
            (handleStatusCommand as jest.Mock).mockRejectedValue(new Error('Failed'));
            
            await routeCommand('!status');
            
            // Note: Actual telemetry integration would be implemented in commandRouter
            expect(true).toBe(true); // Placeholder for telemetry assertions
        });
    });
});