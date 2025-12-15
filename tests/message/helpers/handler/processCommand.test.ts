
import { processCommand } from '../../../../src/message/helpers/handler/processCommand';
import { handleStatusCommand } from '../../../../src/message/helpers/commands/statusCommand';
import { IMessage } from '../../../../src/message/interfaces/IMessage';

// Mock dependencies
jest.mock('../../../../src/message/helpers/commands/statusCommand', () => ({
    handleStatusCommand: jest.fn().mockResolvedValue('Status Report')
}));

describe('processCommand', () => {
    const mockCallback = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return false for non-command messages', async () => {
        const msg = { getText: () => 'Hello world' } as IMessage;
        const result = await processCommand(msg, mockCallback);
        expect(result).toBe(false);
        expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should process status command', async () => {
        const msg = { getText: () => '!status' } as IMessage;
        const result = await processCommand(msg, mockCallback);
        expect(result).toBe(true);
        expect(handleStatusCommand).toHaveBeenCalled();
        expect(mockCallback).toHaveBeenCalledWith('Status Report');
    });

    it('should process simulated generic commands', async () => {
        const msg = { getText: () => '!help' } as IMessage;
        const result = await processCommand(msg, mockCallback);
        expect(result).toBe(true);
        expect(mockCallback).toHaveBeenCalledWith('Executed command: help');
    });

    it('should handle commands with arguments', async () => {
        const msg = { getText: () => '!echo hello world' } as IMessage;
        const result = await processCommand(msg, mockCallback);
        expect(result).toBe(true);
        expect(mockCallback).toHaveBeenCalledWith('Executed command: echo');
    });

    it('should handle status command with args', async () => {
        const msg = { getText: () => '!status full' } as IMessage;
        await processCommand(msg, mockCallback);
        expect(handleStatusCommand).toHaveBeenCalledWith(['full']);
    });

    it('should handle errors gracefully', async () => {
        const msg = { getText: () => { throw new Error('Explosion'); } } as any;
        const result = await processCommand(msg, mockCallback);
        expect(result).toBe(false);
    });
});
