import { parseCommand } from '@message/helpers/commands/parseCommand';

describe('parseCommand', () => {
    it('should return null for empty command content', () => {
        const result = parseCommand('');
        expect(result).toBeNull();
    });

    it('should return null for non-command text', () => {
        const result = parseCommand('Hello World');
        expect(result).toBeNull();
    });

    it('should parse command name correctly', () => {
        const result = parseCommand('!start');
        expect(result).toEqual({
            commandName: 'start',
            action: '',
            args: []
        });
    });

    it('should parse command name and action correctly', () => {
        const result = parseCommand('!start:now');
        expect(result).toEqual({
            commandName: 'start',
            action: 'now',
            args: []
        });
    });

    it('should parse command name, action, and args correctly', () => {
        const result = parseCommand('!start:now quickly');
        expect(result).toEqual({
            commandName: 'start',
            action: 'now',
            args: ['quickly']
        });
    });

    it('should handle multiple arguments', () => {
        const result = parseCommand('!deploy:prod server1 server2 --force');
        expect(result).toEqual({
            commandName: 'deploy',
            action: 'prod',
            args: ['server1', 'server2', '--force']
        });
    });

    it('should handle commands without exclamation mark', () => {
        const result = parseCommand('help');
        expect(result).toBeNull();
    });

    it('should handle whitespace', () => {
        const result = parseCommand('  !status  ');
        expect(result?.commandName).toBe('status');
    });
});