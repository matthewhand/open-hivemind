import { execFile } from 'child_process';
import fs from 'fs';
import { convertOpusToWav } from '@hivemind/message-discord/media/convertOpusToWav';

jest.mock('child_process');
jest.mock('fs');

describe('convertOpusToWav', () => {
  const mockExecFile = execFile as unknown as jest.MockedFunction<any>;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.promises = {
      writeFile: jest.fn().mockResolvedValue(undefined),
      unlink: jest.fn().mockResolvedValue(undefined),
    } as any;
  });

  it('should convert opus to wav successfully', async () => {
    const opusBuffer = Buffer.from('opus data');
    const outputDir = '/temp';

    mockExecFile.mockImplementation((cmd: string, args: string[], callback: any) => {
      callback(null, { stdout: '', stderr: '' });
      return {} as any;
    });

    const result = await convertOpusToWav(opusBuffer, outputDir);

    expect(result).toBe('/temp/output.wav');
    expect(mockFs.promises.writeFile).toHaveBeenCalledWith('/temp/input.opus', opusBuffer);
    expect(mockFs.promises.unlink).toHaveBeenCalledWith('/temp/input.opus');
  });

  it('should handle ffmpeg errors', async () => {
    const opusBuffer = Buffer.from('opus data');

    mockExecFile.mockImplementation((cmd: string, args: string[], callback: any) => {
      if (args && args[0] === '-version') {
        callback(null, { stdout: 'ffmpeg version', stderr: '' });
      } else {
        callback(new Error('ffmpeg error'), null);
      }
      return {} as any;
    });

    await expect(convertOpusToWav(opusBuffer, '/temp')).rejects.toThrow('ffmpeg error');
  });

  it('should handle file write errors', async () => {
    const opusBuffer = Buffer.from('opus data');

    mockExecFile.mockImplementation((cmd: string, args: string[], callback: any) => {
      callback(null, { stdout: 'ffmpeg version', stderr: '' });
      return {} as any;
    });

    mockFs.promises.writeFile = jest.fn().mockRejectedValue(new Error('Permission denied'));

    await expect(convertOpusToWav(opusBuffer, '/temp')).rejects.toThrow('Permission denied');
  });
});
