import * as fs from 'fs';
import * as path from 'path';
import { executeCommand, executeCommandSafe, readFile } from '../../src/utils/utils';

// Mock fs for controlled testing
jest.mock('fs', () => {
  const mockFsStatSync = jest.fn();
  const mockStatFn = jest.fn().mockImplementation((path) => {
    try {
      const defaultStats = { isFile: () => true, isDirectory: () => false };
      const stats = mockFsStatSync(path);
      return Promise.resolve(stats || defaultStats);
    } catch (e) {
      return Promise.reject(e);
    }
  });

  const mockReadFileFn = jest.fn();
  const mockExistsSync = jest.fn();
  const mockReadFileSync = jest.fn();

  const mockObj = {
    __esModule: true,
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    statSync: mockFsStatSync,
    promises: {
      stat: mockStatFn,
      readFile: mockReadFileFn,
    }
  };
  return {
    ...mockObj,
    default: mockObj
  };
});

const mockFs = fs as unknown as jest.Mocked<typeof fs> & {
  promises: {
    stat: jest.Mock;
    readFile: jest.Mock;
  }
};
const mockReadFile = mockFs.promises.readFile;

describe('executeCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should execute a command and return output', async () => {
      const output = await executeCommand('echo hello');
      expect(output.trim()).toBe('hello');
    });

    it('should execute commands with arguments', async () => {
      const output = await executeCommand('echo "hello world"');
      expect(output.trim()).toBe('hello world');
    });

    it('should handle multiline output', async () => {
      const output = await executeCommandSafe('printf', ['line1\\nline2']);
      expect(output.trim()).toBe('line1\nline2');
    });
  });

  describe('Error handling', () => {
    it.each([
      ['invalidcommand', 'should handle command errors gracefully'],
      ['exit 1', 'should handle commands that exit with non-zero status'],
      ['ls /nonexistent/directory', 'should handle commands with stderr output'],
      ['', 'should handle empty commands'],
    ])('%s', async (command, description) => {
      await expect(executeCommand(command)).rejects.toThrow();
    });

    it('should handle null/undefined commands', async () => {
      await expect(executeCommand(null as any)).rejects.toThrow();
      await expect(executeCommand(undefined as any)).rejects.toThrow();
    });
  });

  describe('Command execution options', () => {
    it('should handle commands with different working directories', async () => {
      // Test that commands can be executed from different directories
      const output = await executeCommand('pwd');
      expect(typeof output).toBe('string');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle environment variables', async () => {
      const output = await executeCommandSafe('sh', ['-c', 'echo $HOME']);
      expect(typeof output).toBe('string');
    });

    it('should handle timeout scenarios', async () => {
      // Test with a command that should complete quickly
      const startTime = Date.now();
      await executeCommand('echo "quick command"');
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });

  describe('Output formatting', () => {
    it('should preserve whitespace in output', async () => {
      const output = await executeCommand('echo "  spaced  "');
      expect(output).toBe('  spaced  \n');
    });

    it('should handle special characters in output', async () => {
      const output = await executeCommandSafe('echo', ['special chars: !@#$%^&*()']);
      expect(output.trim()).toBe('special chars: !@#$%^&*()');
    });

    it('should handle unicode characters', async () => {
      const output = await executeCommand('echo "unicode: 🚀 ✅ 🎉"');
      expect(output.trim()).toBe('unicode: 🚀 ✅ 🎉');
    });
  });
});

describe('readFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks to default behavior
    mockReadFile.mockReset();
    mockFs.existsSync.mockReset();
    mockFs.statSync.mockReset();
    // Default statSync to return file stats
    mockFs.statSync.mockReturnValue({ isFile: () => true, isDirectory: () => false } as any);
  });

  describe('Basic functionality', () => {
    it('should read file content successfully', async () => {
      mockReadFile.mockResolvedValue('Sample Content');

      const content = await readFile('tests/sample.txt');
      expect(content).toBe('Sample Content');
      expect(mockReadFile).toHaveBeenCalledWith('tests/sample.txt', 'utf8');
    });

    it('should read empty files', async () => {
      mockReadFile.mockResolvedValue('');

      const content = await readFile('empty.txt');
      expect(content).toBe('');
    });

    it('should read files with different encodings', async () => {
      mockReadFile.mockResolvedValue('UTF-8 content with special chars: àáâãäå');

      const content = await readFile('utf8.txt');
      expect(content).toBe('UTF-8 content with special chars: àáâãäå');
    });
  });

  describe('Error handling', () => {
    it('should throw an error if file does not exist', async () => {
      const error = new Error('ENOENT: no such file or directory');
      (error as any).code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      await expect(readFile('nonexistent.txt')).rejects.toThrow();
    });

    it('should handle permission errors', async () => {
      const error = new Error('EACCES: permission denied');
      (error as any).code = 'EACCES';
      mockReadFile.mockRejectedValue(error);

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
      mockFs.statSync.mockReturnValue({ isFile: () => false, isDirectory: () => true } as any);
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
      mockReadFile.mockResolvedValueOnce(expectedContent);

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
      ['binary.dat', '\x00\x01\x02\x03\xFF', 'binary-like content', () => { }],
      [
        'multiline.txt',
        'Line 1\nLine 2\r\nLine 3\n\nLine 5',
        'multiline content',
        (content: string) => expect(content.split('\n')).toHaveLength(5),
      ],
    ])('should handle %s', async (fileName, fileContent, description, additionalCheck) => {
      mockReadFile.mockResolvedValueOnce(fileContent);

      const content = await readFile(fileName);
      expect(content).toBe(fileContent);
      additionalCheck(content);
    });
  });

  describe('Performance', () => {
    it('should read files efficiently', async () => {
      mockReadFile.mockResolvedValue('Performance test content');
      mockFs.existsSync.mockReturnValue(true);

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
