import fs from 'fs';
import { speechToText, transcribeAudio } from './speechToText';

describe('speechToText', () => {
  const ORIGINAL_ENV = { ...process.env };
  const AUDIO_PATH = '/tmp/output.wav';

  let existsSyncSpy: jest.SpyInstance;
  let readFileSpy: jest.SpyInstance;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_TRANSCRIBE_MODEL;
    delete process.env.DISCORD_STT_TIMEOUT_MS;
    process.env.OPENAI_API_KEY = 'sk-test';

    existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    readFileSpy = jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(Buffer.from('fake-audio-bytes'));

    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ text: '  hello world  ' }),
    });
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete (global as any).fetch;
  });

  it('transcribeAudio is an alias for speechToText', () => {
    expect(transcribeAudio).toBe(speechToText);
  });

  it('returns empty string when OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await speechToText(AUDIO_PATH);
    expect(result).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns empty string when the audio file does not exist', async () => {
    existsSyncSpy.mockReturnValue(false);
    const result = await speechToText(AUDIO_PATH);
    expect(result).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns empty string when the audio file is empty', async () => {
    readFileSpy.mockResolvedValue(Buffer.alloc(0));
    const result = await speechToText(AUDIO_PATH);
    expect(result).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the trimmed transcription text on success', async () => {
    const result = await speechToText(AUDIO_PATH);
    expect(result).toBe('hello world');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('posts to the default OpenAI transcription endpoint with auth and form fields', async () => {
    await speechToText(AUDIO_PATH);
    const [calledUrl, options] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('https://api.openai.com/v1/audio/transcriptions');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer sk-test');
    expect(options.body).toBeInstanceOf(FormData);
    const body = options.body as FormData;
    expect(body.get('model')).toBe('whisper-1');
    expect(body.get('file')).toBeInstanceOf(Blob);
  });

  it('honors a custom base URL without duplicating the API version segment', async () => {
    process.env.OPENAI_BASE_URL = 'https://proxy.example.com/v1/';
    await speechToText(AUDIO_PATH);
    expect(fetchMock.mock.calls[0][0]).toBe('https://proxy.example.com/v1/audio/transcriptions');
  });

  it('appends /v1 to a base URL that lacks a version segment', async () => {
    process.env.OPENAI_BASE_URL = 'https://api.openai.com';
    await speechToText(AUDIO_PATH);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.openai.com/v1/audio/transcriptions');
  });

  it('uses a custom transcription model when configured', async () => {
    process.env.OPENAI_TRANSCRIBE_MODEL = 'gpt-4o-transcribe';
    await speechToText(AUDIO_PATH);
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get('model')).toBe('gpt-4o-transcribe');
  });

  it('returns empty string when the API responds with a non-ok status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    const result = await speechToText(AUDIO_PATH);
    expect(result).toBe('');
  });

  it('returns empty string when fetch rejects', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const result = await speechToText(AUDIO_PATH);
    expect(result).toBe('');
  });

  it('returns empty string when the response has no text field', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const result = await speechToText(AUDIO_PATH);
    expect(result).toBe('');
  });

  it('returns empty string when reading the audio file throws', async () => {
    readFileSpy.mockRejectedValue(new Error('EACCES'));
    const result = await speechToText(AUDIO_PATH);
    expect(result).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
