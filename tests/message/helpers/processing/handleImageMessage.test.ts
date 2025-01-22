import { createPrediction, handleImageMessage, predictionImageMap } from '../../../../src/message/helpers/processing/handleImageMessage';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('handleImageMessage', () => {
  let message: any;

  beforeEach(() => {
    process.env.DISCORD_CHAT_CHANNEL_ID = 'test-channel-id';
    process.env.REPLICATE_WEBHOOK_URL = 'http://example.com/webhook';
    jest.spyOn(console, 'error').mockImplementation();
    message = {
      channel: {
        id: process.env.DISCORD_CHAT_CHANNEL_ID || 'test-channel-id',
      },
      attachments: {
        size: 1,
        first: jest.fn().mockReturnValue({ url: 'http://example.com/image.jpg' }),
      },
      reply: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    (console.error as jest.Mock).mockRestore();
    predictionImageMap.clear();
  });

  it('should process an image message and create a prediction', async () => {
    const predictionResult = { id: 'prediction-id', output: 'Prediction output' };
    mockedAxios.post.mockResolvedValue({ data: predictionResult });

    const result = await handleImageMessage(message);

    expect(result).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalled();
    expect(predictionImageMap.get('prediction-id')).toBe('http://example.com/image.jpg');
  });

  it('should handle messages without attachments', async () => {
    message.attachments.size = 0;
    const result = await handleImageMessage(message);

    expect(result).toBe(false);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('should return false for messages in other channels', async () => {
    message.channel.id = 'other-channel-id';
    const result = await handleImageMessage(message);

    expect(result).toBe(false);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Network Error'));
    const result = await handleImageMessage(message);

    expect(result).toBe(false);
    // expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error in handleImageMessage'), 'Network Error');
  });
});

describe('createPrediction', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('should create a prediction and return data', async () => {
    const predictionResult = { id: 'prediction-id', output: 'Prediction output' };
    mockedAxios.post.mockResolvedValue({ data: predictionResult });

    const result = await createPrediction('http://example.com/image.jpg');

    expect(result).toEqual(predictionResult);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.replicate.com/v1/predictions',
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: expect.stringContaining('Token'),
        }),
      })
    );
  });

  it('should throw an error when axios call fails', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Network Error'));

    await expect(createPrediction('http://example.com/image.jpg')).rejects.toThrow('Failed to create prediction');
    expect(console.error).toHaveBeenCalledWith('Failed to create prediction:', 'Network Error');
  });

  it('should set sync to true when REPLICATE_WEBHOOK_URL is not set', async () => {
    delete process.env.REPLICATE_WEBHOOK_URL;
    mockedAxios.post.mockResolvedValue({ data: {} });

    await createPrediction('http://example.com/image.jpg');

    const postData = mockedAxios.post.mock.calls[0][1] as any;
    expect(postData.sync).toBe(true);
  });

  it('should include webhook data when REPLICATE_WEBHOOK_URL is set', async () => {
    process.env.REPLICATE_WEBHOOK_URL = 'http://example.com/webhook';
    mockedAxios.post.mockResolvedValue({ data: {} });

    await createPrediction('http://example.com/image.jpg');

    const postData = mockedAxios.post.mock.calls[0][1] as any;
    expect(postData.webhook).toBe('http://example.com/webhook');
    expect(postData.webhook_events_filter).toEqual(['start', 'completed']);
  });
});