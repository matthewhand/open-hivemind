import { routeCommand } from '@src/message/helpers/commands/commandRouter';
import { handleStatusCommand } from '@src/message/helpers/commands/statusCommand';

jest.mock('@src/message/helpers/commands/statusCommand');

describe('command permissions', () => {
    const mockHandleStatusCommand = handleStatusCommand as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle unauthorized access', async () => {
        mockHandleStatusCommand.mockRejectedValue(new Error('Unauthorized: Admin access required'));

        const result = await routeCommand('!status admin');

        expect(result).toBe('Error: Unauthorized: Admin access required');
    });

    it('should handle rate limiting', async () => {
        mockHandleStatusCommand.mockRejectedValue(new Error('Rate limit exceeded'));

        const result = await routeCommand('!status');

        expect(result).toBe('Error: Rate limit exceeded');
    });

    it('should handle service unavailable', async () => {
        mockHandleStatusCommand.mockRejectedValue(new Error('Service temporarily unavailable'));

        const result = await routeCommand('!status');

        expect(result).toBe('Error: Service temporarily unavailable');
    });

    it('should handle timeout errors', async () => {
        mockHandleStatusCommand.mockRejectedValue(new Error('Request timeout'));

        const result = await routeCommand('!status');

        expect(result).toBe('Error: Request timeout');
    });
});