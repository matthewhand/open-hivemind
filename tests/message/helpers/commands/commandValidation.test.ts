import { parseCommand } from '@src/message/helpers/commands/parseCommand';

describe('command validation', () => {
    describe('input sanitization', () => {
        it('should handle null and undefined inputs', () => {
            expect(parseCommand(null as any)).toBeNull();
            expect(parseCommand(undefined as any)).toBeNull();
        });

        it('should handle empty strings', () => {
            expect(parseCommand('')).toBeNull();
            expect(parseCommand('   ')).toBeNull();
        });

        it('should handle injection attempts', () => {
            const injectionAttempts = [
                '!status; rm -rf /',
                '!status && echo "hacked"',
                '!status | cat /etc/passwd',
                '!status $(whoami)',
                '!status `ls -la`'
            ];

            injectionAttempts.forEach(attempt => {
                const result = parseCommand(attempt);
                expect(result).toBeTruthy();
                // Commands are parsed as-is, security should be handled at execution level
                expect(result?.commandName).toBe('status');
            });
        });

        it('should handle unicode and special characters', () => {
            const unicodeCommand = '!status 测试 🚀 émojis';
            const result = parseCommand(unicodeCommand);
            
            expect(result).toEqual({
                commandName: 'status',
                action: '',
                args: ['测试', '🚀', 'émojis']
            });
        });
    });

    describe('boundary conditions', () => {
        it('should handle maximum argument limits', () => {
            const manyArgs = Array(100).fill('arg').map((_, i) => `arg${i}`);
            const command = `!test ${manyArgs.join(' ')}`;

            const result = parseCommand(command);
            expect(result?.args).toHaveLength(100);
        });

        it('should handle very long arguments', () => {
            const longArg = 'a'.repeat(10000);
            const command = `!test ${longArg}`;

            const result = parseCommand(command);
            expect(result?.args[0]).toBe(longArg);
        });

        it('should handle nested quotes and escapes', () => {
            const result = parseCommand('!test "nested quotes" and escapes');
            
            expect(result?.args).toEqual(['"nested', 'quotes"', 'and', 'escapes']);
        });
    });

    describe('performance validation', () => {
        it('should parse commands efficiently', () => {
            const start = Date.now();
            
            for (let i = 0; i < 1000; i++) {
                parseCommand(`!test arg${i}`);
            }
            
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(100); // Should parse 1000 commands in <100ms
        });
    });
});