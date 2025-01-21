import { executeCommand, readFile } from '../../src/utils/utils';

describe('executeCommand', () => {
    it('should execute a command and return output', async () => {
        const output = await executeCommand('echo hello');
        expect(output.trim()).toBe('hello');
    });

    it('should handle command errors gracefully', async () => {
        await expect(executeCommand('invalidcommand')).rejects.toThrow();
    });
});

describe('readFile', () => {
    it('should read file content', async () => {
        const content = await readFile('tests/sample.txt');
        expect(content).toBe('Sample Content');
    });

    it('should throw an error if file does not exist', async () => {
        await expect(readFile('nonexistent.txt')).rejects.toThrow();
    });
});