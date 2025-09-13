import { transcribeAudio } from '@src/integrations/discord/voice/speechToText';
import OpenAI from 'openai';
import fs from 'fs';

jest.mock('openai');
jest.mock('fs');

describe('speechToText', () => {
  const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle transcription and error scenarios', async () => {
    // Test successful transcription
    const mockTranscription = { text: 'Hello world' };
    const mockCreateReadStream = jest.fn();
    mockFs.createReadStream = mockCreateReadStream;

    const mockInstance = {
      audio: {
        transcriptions: {
          create: jest.fn().mockResolvedValue(mockTranscription)
        }
      }
    };
    mockOpenAI.mockImplementation(() => mockInstance as any);

    const result = await transcribeAudio('/path/to/audio.wav');
    expect(result).toBe('Hello world');

    // Test transcription errors
    const errorInstance = {
      audio: {
        transcriptions: {
          create: jest.fn().mockRejectedValue(new Error('API Error'))
        }
      }
    };
    mockOpenAI.mockImplementation(() => errorInstance as any);

    await expect(transcribeAudio('/path/to/audio.wav')).rejects.toThrow('API Error');

    // Test file not found
    const fileErrorReadStream = jest.fn().mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });
    mockFs.createReadStream = fileErrorReadStream;

    await expect(transcribeAudio('/nonexistent.wav')).rejects.toThrow('ENOENT');
  });
});