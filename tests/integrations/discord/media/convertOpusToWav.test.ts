import fs from 'fs';
import util from 'util';
import { convertOpusToWav } from '@hivemind/adapter-discord/media/convertOpusToWav';

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    unlink: jest.fn(),
  },
}));

jest.mock('util', () => {
  const originalUtil = jest.requireActual('util');
  return {
    ...originalUtil,
    promisify: (fn: any) => {
      // Only mock if it's likely child_process.execFile
      if (fn.name === 'execFile') {
        return (...args: any[]) => {
          const m = jest.requireMock('util');
          return (m as any).__mockExecFilePromise(...args);
        };
      }
      return originalUtil.promisify(fn);
    },
    __mockExecFilePromise: jest.fn(),
  };
});

describe('convertOpusToWav', () => {
  let mockExecFilePromise: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecFilePromise = (util as any).__mockExecFilePromise;
    mockExecFilePromise.mockReset();
    (fs.promises.writeFile as jest.Mock).mockReset();
    (fs.promises.unlink as jest.Mock).mockReset();
  });

  afterEach(() => {
    // Reset ffmpegAvailable cache
    jest.isolateModules(() => {
      // nothing needed, test resets are fast but let's clear it
    });
  });

  it('should convert opus to wav successfully', async () => {
    const opusBuffer = Buffer.from('opus data');
    const outputDir = '/temp';

    mockExecFilePromise.mockResolvedValue({ stdout: '', stderr: '' });

    // Since checkFfmpegAvailable caches, we reset module imports to test it fresh if needed
    // but the test should pass anyway.
    const result = await convertOpusToWav(opusBuffer, outputDir);

    expect(result).toBe('/temp/output.wav');
    expect(fs.promises.writeFile).toHaveBeenCalledWith('/temp/input.opus', opusBuffer);
    expect(fs.promises.unlink).toHaveBeenCalledWith('/temp/input.opus');
    expect(mockExecFilePromise).toHaveBeenCalledWith('ffmpeg', ['-version']);
    expect(mockExecFilePromise).toHaveBeenCalledWith('ffmpeg', [
      '-y',
      '-i',
      '/temp/input.opus',
      '/temp/output.wav',
    ]);
  });

  it('should handle ffmpeg errors', async () => {
    // Since ffmpegAvailable is cached globally in the module, let's reset module
    jest.resetModules();
    const mockFs = jest.requireMock('fs');
    mockFs.promises.writeFile.mockReset();
    mockFs.promises.unlink.mockReset();
    const mockUtil = jest.requireMock('util');
    const localMockExecFilePromise = mockUtil.__mockExecFilePromise;
    localMockExecFilePromise.mockReset();

    const { convertOpusToWav: freshConvert } =
      await import('@hivemind/adapter-discord/media/convertOpusToWav');

    const opusBuffer = Buffer.from('opus data');

    localMockExecFilePromise.mockRejectedValue(new Error('ffmpeg not found'));

    // The current implementation wraps this in a HivemindError
    await expect(freshConvert(opusBuffer, '/temp')).rejects.toThrow('FFmpeg is not available');
  });

  it('should handle file write errors', async () => {
    jest.resetModules();
    const mockFs = jest.requireMock('fs');
    mockFs.promises.writeFile.mockReset();
    mockFs.promises.unlink.mockReset();
    const mockUtil = jest.requireMock('util');
    const localMockExecFilePromise = mockUtil.__mockExecFilePromise;
    localMockExecFilePromise.mockReset();

    const { convertOpusToWav: freshConvert } =
      await import('@hivemind/adapter-discord/media/convertOpusToWav');

    const opusBuffer = Buffer.from('opus data');

    // First mock success for the ffmpeg check
    localMockExecFilePromise.mockResolvedValueOnce({ stdout: '', stderr: '' });

    mockFs.promises.writeFile.mockRejectedValue(new Error('Permission denied'));

    await expect(freshConvert(opusBuffer, '/temp')).rejects.toThrow('Permission denied');
  });
});
