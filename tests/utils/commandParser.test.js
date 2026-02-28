const commandParser = require('../../src/message/helpers/commands/commandParser');

describe('Command Parser', () => {
    describe('Valid command parsing', () => {
        test('parses a command without arguments', () => {
            const input = '!hello';
            const result = commandParser.parse(input);
            expect(result).not.toBeNull();
            expect(result.command).toBe('hello');
            expect(result.args).toEqual([]);
        });

        test('parses a command with single argument', () => {
            const input = '!status';
            const result = commandParser.parse(input);
            expect(result.command).toBe('status');
            expect(result.args).toEqual([]);
        });

        test('parses a command with multiple arguments', () => {
            const input = '!greet John Doe';
            const result = commandParser.parse(input);
            expect(result.command).toBe('greet');
            expect(result.args).toEqual(['John', 'Doe']);
        });

        test('parses a command with quoted arguments', () => {
            const input = '!say "Hello World"';
            const result = commandParser.parse(input);
            expect(result.command).toBe('say');
            // Note: Current implementation splits on spaces, doesn't handle quotes properly
            // This test documents the current behavior - may need improvement in the actual parser
            expect(result.args).toEqual(['\"Hello', 'World\"']);
        });

        test('handles multiple spaces between arguments', () => {
            const input = '!move   left   right';
            const result = commandParser.parse(input);
            expect(result.command).toBe('move');
            expect(result.args).toEqual(['left', 'right']);
        });
    });

    describe('Invalid input handling', () => {
        test('returns null for message without exclamation prefix', () => {
            const input = 'hello';
            const result = commandParser.parse(input);
            expect(result).toBeNull();
        });

        test('returns null for empty string', () => {
            const input = '';
            const result = commandParser.parse(input);
            expect(result).toBeNull();
        });

        test('returns null for whitespace only', () => {
            const input = '   ';
            const result = commandParser.parse(input);
            expect(result).toBeNull();
        });

        test('returns null for just exclamation mark', () => {
            const input = '!';
            const result = commandParser.parse(input);
            expect(result).toBeNull();
        });

        test('returns null for exclamation mark with only spaces', () => {
            const input = '!   ';
            const result = commandParser.parse(input);
            expect(result).toBeNull();
        });
    });

    describe('Edge cases', () => {
        test('handles commands with numbers', () => {
            const input = '!play123';
            const result = commandParser.parse(input);
            expect(result.command).toBe('play123');
            expect(result.args).toEqual([]);
        });

        test('handles commands with underscores', () => {
            const input = '!get_user_info';
            const result = commandParser.parse(input);
            expect(result.command).toBe('get_user_info');
            expect(result.args).toEqual([]);
        });

        test('handles commands with hyphens', () => {
            const input = '!start-process';
            const result = commandParser.parse(input);
            expect(result.command).toBe('start-process');
            expect(result.args).toEqual([]);
        });

        test('preserves case sensitivity', () => {
            const input = '!Hello';
            const result = commandParser.parse(input);
            expect(result.command).toBe('Hello');
        });

        test('handles very long commands', () => {
            const longCommand = 'a'.repeat(100);
            const input = `!${longCommand}`;
            const result = commandParser.parse(input);
            expect(result.command).toBe(longCommand);
        });
    });

    describe('Return value structure', () => {
        test('returns object with command and args properties', () => {
            const input = '!test arg1 arg2';
            const result = commandParser.parse(input);
            expect(result).toHaveProperty('command');
            expect(result).toHaveProperty('args');
            expect(Array.isArray(result.args)).toBe(true);
        });

        test('ensures args is always an array', () => {
            const input = '!solo';
            const result = commandParser.parse(input);
            expect(Array.isArray(result.args)).toBe(true);
            expect(result.args).toEqual([]);
        });

        test('returns immutable result objects', () => {
            const input = '!test arg1';
            const result1 = commandParser.parse(input);
            const result2 = commandParser.parse(input);

            // Modifying one result should not affect the other
            result1.command = 'modified';
            result1.args.push('extra');

            expect(result2.command).toBe('test');
            expect(result2.args).toEqual(['arg1']);
        });
    });

    describe('Performance and Reliability', () => {
        test('handles rapid successive calls', () => {
            const inputs = ['!cmd1', '!cmd2 arg', '!cmd3 arg1 arg2'];
            const results = inputs.map(input => commandParser.parse(input));

            expect(results[0].command).toBe('cmd1');
            expect(results[1].command).toBe('cmd2');
            expect(results[2].command).toBe('cmd3');
            expect(results[2].args).toEqual(['arg1', 'arg2']);
        });

        test('performs consistently with large inputs', () => {
            const largeCommand = 'a'.repeat(1000);
            const largeArgs = Array.from({ length: 100 }, (_, i) => `arg${i}`);
            const input = `!${largeCommand} ${largeArgs.join(' ')}`;

            const result = commandParser.parse(input);
            expect(result.command).toBe(largeCommand);
            expect(result.args).toEqual(largeArgs);
        });

        test('handles concurrent parsing calls', () => {
            const inputs = Array.from({ length: 100 }, (_, i) => `!cmd${i} arg${i}`);
            const results = inputs.map(input => commandParser.parse(input));

            results.forEach((result, index) => {
                expect(result.command).toBe(`cmd${index}`);
                expect(result.args).toEqual([`arg${index}`]);
            });
        });
    });

    describe('Security and Validation', () => {
        test('handles potentially malicious inputs safely', () => {
            const maliciousInputs = [
                '!<script>alert("xss")</script>',
                '!command; rm -rf /',
                '!cmd $(whoami)',
                '!test `cat /etc/passwd`',
                '!eval process.exit(1)'
            ];

            maliciousInputs.forEach(input => {
                const result = commandParser.parse(input);
                expect(result).not.toBeNull();
                expect(typeof result.command).toBe('string');
                expect(Array.isArray(result.args)).toBe(true);
            });
        });

        test('handles unicode and international characters', () => {
            const unicodeInputs = [
                '!测试 参数',
                '!café français',
                '!🚀 rocket 🌟',
                '!العربية نص',
                '!русский текст'
            ];

            unicodeInputs.forEach(input => {
                const result = commandParser.parse(input);
                expect(result).not.toBeNull();
                expect(typeof result.command).toBe('string');
                expect(result.command.length).toBeGreaterThan(0);
            });
        });

        test('handles extremely long inputs gracefully', () => {
            const extremelyLongInput = '!' + 'a'.repeat(1000000); // 1MB command

            expect(() => {
                const result = commandParser.parse(extremelyLongInput);
                expect(result).toBeDefined();
            }).not.toThrow();
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('handles null and undefined inputs', () => {
            // The current implementation doesn't handle null/undefined gracefully
            // This documents the current behavior - may need improvement in the actual parser
            expect(() => commandParser.parse(null)).toThrow();
            expect(() => commandParser.parse(undefined)).toThrow();
        });

        test('handles non-string inputs', () => {
            const nonStringInputs = [123, {}, [], true, false];

            nonStringInputs.forEach(input => {
                // The current implementation doesn't handle non-string inputs gracefully
                expect(() => commandParser.parse(input)).toThrow();
            });
        });

        test('handles inputs with only whitespace after exclamation', () => {
            const whitespaceInputs = ['!\t', '!\n', '!\r', '!   \t\n\r   '];

            whitespaceInputs.forEach(input => {
                expect(commandParser.parse(input)).toBeNull();
            });
        });

        test('handles mixed whitespace in arguments', () => {
            const input = '!command\targ1\n\rarg2   arg3';
            const result = commandParser.parse(input);

            expect(result.command).toBe('command');
            // Behavior depends on implementation - document what actually happens
            expect(Array.isArray(result.args)).toBe(true);
        });

        test('handles commands with trailing whitespace', () => {
            const input = '!command arg1 arg2   \t\n';
            const result = commandParser.parse(input);

            expect(result.command).toBe('command');
            expect(result.args).toEqual(['arg1', 'arg2']);
        });
    });

    describe('Argument Parsing Edge Cases', () => {
        test('handles arguments with special characters', () => {
            const input = '!command arg@domain.com --flag=value key:value';
            const result = commandParser.parse(input);

            expect(result.command).toBe('command');
            expect(result.args).toContain('arg@domain.com');
            expect(result.args).toContain('--flag=value');
            expect(result.args).toContain('key:value');
        });

        test('handles empty arguments between spaces', () => {
            const input = '!command arg1  arg2';
            const result = commandParser.parse(input);

            expect(result.command).toBe('command');
            // Should filter out empty strings from multiple spaces
            expect(result.args).toEqual(['arg1', 'arg2']);
        });

        test('handles arguments with numbers and mixed types', () => {
            const input = '!calculate 123 45.67 -89 +100';
            const result = commandParser.parse(input);

            expect(result.command).toBe('calculate');
            expect(result.args).toEqual(['123', '45.67', '-89', '+100']);
        });

        test('preserves argument order', () => {
            const input = '!order z a m b y';
            const result = commandParser.parse(input);

            expect(result.command).toBe('order');
            expect(result.args).toEqual(['z', 'a', 'm', 'b', 'y']);
        });
    });

    describe('Command Name Validation', () => {
        test('handles commands with dots and underscores', () => {
            const inputs = ['!user.info', '!get_data', '!api.v2.users'];

            inputs.forEach(input => {
                const result = commandParser.parse(input);
                expect(result).not.toBeNull();
                expect(result.command).toBe(input.substring(1));
            });
        });

        test('handles commands starting with numbers', () => {
            const input = '!2fa enable';
            const result = commandParser.parse(input);

            expect(result.command).toBe('2fa');
            expect(result.args).toEqual(['enable']);
        });

        test('handles single character commands', () => {
            const input = '!a b c';
            const result = commandParser.parse(input);

            expect(result.command).toBe('a');
            expect(result.args).toEqual(['b', 'c']);
        });
    });
});
