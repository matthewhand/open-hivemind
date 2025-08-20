import { convertOpusToWav } from '@src/integrations/discord/media/convertOpusToWav';
import { exec } from 'child_process';
import fs from 'fs';

jest.mock('child_process');
jest.mock('fs');

describe('convertOpusToWav', () => {
  const mockExec = exec as jest.MockedFunction<typeof exec>;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.promises = {
      writeFile: jest.fn(),
      unlink: jest.fn()
    } as any;
  });

  it('should convert opus to wav successfully', async () => {
    const opusBuffer = Buffer.from('opus data');
    const outputDir = '/temp';
    
    mockExec.mockImplementation((cmd, callback: any) => {
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
    
    mockExec.mockImplementation((cmd, callback: any) => {
      callback(new Error('ffmpeg not found'), null);
      return {} as any;
    });

    await expect(convertOpusToWav(opusBuffer, '/temp'))
      .rejects.toThrow('ffmpeg not found');
  });

  it('should handle file write errors', async () => {
    const opusBuffer = Buffer.from('opus data');
    
    mockFs.promises.writeFile = jest.fn().mockRejectedValue(new Error('Permission denied'));

    await expect(convertOpusToWav(opusBuffer, '/temp'))
      .rejects.toThrow('Permission denied');
  });
});