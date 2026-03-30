import * as path from 'path';
import { executeCommandSafe, readFile } from '../../src/utils/utils';

// Create mock functions that will be used in the fs mock factory
const mockStat = jest.fn();
const mockReadFileAsync = jest.fn();

// Mock fs - must use jest.fn() references defined above
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    __esModule: true,
    default: {
      promises: {
        stat: (...args: any[]) => mockStat(...args),
        readFile: (...args: any[]) => mockReadFileAsync(...args),
      },
      mkdtempSync: actualFs.mkdtempSync,
      rmdirSync: actualFs.rmdirSync,
    },
    promises: {
      stat: (...args: any[]) => mockStat(...args),
      readFile: (...args: any[]) => mockReadFileAsync(...args),
    },
    mkdtempSync: actualFs.mkdtempSync,
    rmdirSync: actualFs.rmdirSync,
  };
});

describe('executeCommandSafe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should execute a command and return output', async () => {
      const output = await executeCommandSafe('echo', ['hello']);
      expect(output.trim()).toBe('hello');
    });

    it('should execute commands with arguments', async () => {
      const output = await executeCommandSafe('echo', ['hello world']);
      expect(output.trim()).toBe('hello world');
    });

    it('should handle multiline output', async () => {
      const output = await executeCommandSafe('printf', ['line1\nline2']);
      expect(output.trim()).toBe('line1\nline2');
    });
  });

  describe('Error handling', () => {
    it.each([
      ['invalidcommand', [], 'should handle command errors gracefully'],
      ['exit', ['1'], 'should handle commands that exit with non-zero status'],
      ['ls', ['/nonexistent/directory'], 'should handle commands with stderr output'],
      ['', [], 'should handle empty commands'],
    ])('%s %p', async (command, args, description) => {
      await expect(executeCommandSafe(command, args)).rejects.toThrow();
    });

    it('should handle null/undefined commands', async () => {
      await expect(executeCommandSafe(null as any)).rejects.toThrow();
      await expect(executeCommandSafe(undefined as any)).rejects.toThrow();
    });
  });

  describe('Command execution options', () => {
    it('should handle commands with different working directories', async () => {
      // Test that commands can be executed from different directories
      const output = await executeCommandSafe('pwd', []);
      expect(typeof output).toBe('string');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle environment variables', async () => {
      const output = await executeCommandSafe('echo', [process.env.HOME || '']);
      expect(typeof output).toBe('string');
    });

    it('should handle timeout scenarios', async () => {
      // Test with a command that should complete quickly
      const startTime = Date.now();
      await executeCommandSafe('echo', ['quick command']);
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should kill process and reject when timeout is exceeded', async () => {
      // Note: This test might be slow or flaky in some environments
      // We use a small timeout to verify rejection
      await expect(executeCommandSafe('sleep', ['2'], { timeout: 100 })).rejects.toThrow();
    });

    it('should respect the working directory (cwd) option', async () => {
      const realFs = jest.requireActual('fs');
      const tempDir = realFs.mkdtempSync(path.join(process.cwd(), 'test-cwd-'));
      try {
        const output = await executeCommandSafe('pwd', [], { cwd: tempDir });
        // Normalize paths for comparison (handle potential symlinks or OS differences)
        expect(output.trim()).toMatch(new RegExp(path.basename(tempDir) + '$'));
      } finally {
        realFs.rmdirSync(tempDir);
      }
    });
  });

  describe('Output formatting', () => {
    it('should preserve whitespace in output', async () => {
      const output = await executeCommandSafe('echo', ['  spaced  ']);
      expect(output).toBe('  spaced  \n');
    });

    it('should handle special characters in output', async () => {
      const output = await executeCommandSafe('echo', ['special chars: !@#$%^&*()']);
      expect(output.trim()).toBe('special chars: !@#$%^&*()');
    });

    it('should handle unicode characters', async () => {
      const output = await executeCommandSafe('echo', ['unicode: 🚀 ✅ 🎉']);
      expect(output.trim()).toBe('unicode: 🚀 ✅ 🎉');
    });
  });
});

describe('readFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default stat to return file stats
    mockStat.mockResolvedValue({ isFile: () => true, isDirectory: () => false });
  });

  describe('Basic functionality', () => {
    it('should read file content successfully', async () => {
      mockReadFileAsync.mockResolvedValue('Sample Content');

      const content = await readFile('tests/sample.txt');
      expect(content).toBe('Sample Content');
    });

    it('should read empty files', async () => {
      mockReadFileAsync.mockResolvedValue('');

      const content = await readFile('empty.txt');
      expect(content).toBe('');
    });

    it('should read files with different encodings', async () => {
      mockReadFileAsync.mockResolvedValue('UTF-8 content with special chars: àáâãäå');

      const content = await readFile('utf8.txt');
      expect(content).toBe('UTF-8 content with special chars: àáâãäå');
    });
  });

  describe('Error handling', () => {
    it('should throw an error if file does not exist', async () => {
      const error = new Error('ENOENT: no such file or directory');
      (error as any).code = 'ENOENT';
      mockStat.mockRejectedValue(error);

      await expect(readFile('nonexistent.txt')).rejects.toThrow();
    });

    it('should handle permission errors', async () => {
      const error = new Error('EACCES: permission denied');
      (error as any).code = 'EACCES';
      mockStat.mockRejectedValue(error);

      await expect(readFile('restricted.txt')).rejects.toThrow();
    });

    it('should handle null/undefined file paths', async () => {
      await expect(readFile(null as any)).rejects.toThrow();
      await expect(readFile(undefined as any)).rejects.toThrow();
    });

    it('should handle empty file paths', async () => {
      await expect(readFile('')).rejects.toThrow();
    });

    it('should handle directory paths instead of files', async () => {
      mockStat.mockResolvedValue({ isFile: () => false, isDirectory: () => true });
      await expect(readFile('directory')).rejects.toThrow();
    });
  });

  describe('File path handling', () => {
    test.each([
      ['/absolute/path/file.txt', 'Absolute path content', 'absolute paths'],
      ['./relative/path/file.txt', 'Relative path content', 'relative paths'],
      [
        'file with spaces & special chars!.txt',
        'Special chars content',
        'paths with special characters',
      ],
      ['path\\with\\backslashes.txt', 'Normalized content', 'path separators'],
    ])('should handle %s', async (filePath, expectedContent, description) => {
      mockReadFileAsync.mockResolvedValueOnce(expectedContent);

      const content = await readFile(filePath);
      expect(content).toBe(expectedContent);
    });
  });

  describe('Content types', () => {
    test.each([
      [
        'config.json',
        JSON.stringify({ key: 'value', number: 42 }),
        'JSON files',
        (content: string) => expect(() => JSON.parse(content)).not.toThrow(),
      ],
      [
        'large.txt',
        'x'.repeat(10000),
        'large files',
        (content: string) => expect(content.length).toBe(10000),
      ],
      ['binary.dat', '\x00\x01\x02\x03\xFF', 'binary-like content', () => {}],
      [
        'multiline.txt',
        'Line 1\nLine 2\r\nLine 3\n\nLine 5',
        'multiline content',
        (content: string) => expect(content.split('\n')).toHaveLength(5),
      ],
    ])('should handle %s', async (fileName, fileContent, description, additionalCheck) => {
      mockReadFileAsync.mockResolvedValueOnce(fileContent);

      const content = await readFile(fileName);
      expect(content).toBe(fileContent);
      additionalCheck(content);
    });
  });

  describe('Performance', () => {
    it('should read files efficiently', async () => {
      mockReadFileAsync.mockResolvedValue('Performance test content');

      const startTime = Date.now();

      // Read multiple files
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(readFile(`file${i}.txt`));
      }

      await Promise.all(promises);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});
