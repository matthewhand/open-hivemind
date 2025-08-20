import { handleStatusCommand } from '../../../../src/message/helpers/commands/statusCommand';

describe('handleStatusCommand', () => {
    it('should return the correct status message without arguments', async () => {
        const result = await handleStatusCommand([]);
        expect(result).toBe('System is operational. All services are running smoothly.');
    });

    it('should handle additional arguments gracefully', async () => {
        const args = ['extra', 'arguments'];
        const result = await handleStatusCommand(args);
        expect(result).toBe('System is operational. All services are running smoothly.');
    });

    // Add more test cases as needed
});