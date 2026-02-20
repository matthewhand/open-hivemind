import axios from 'axios';
import {
  createPrediction,
  handleImageMessage,
  predictionImageMap,
} from '@message/helpers/processing/handleImageMessage';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('handleImageMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    predictionImageMap.clear();
    process.env.DISCORD_CHAT_CHANNEL_ID = 'test-channel-id';
  });

  it('should process an image message and create a prediction', async () => {
    const mockMessage = {
      channel: { id: 'test-channel-id' },
      attachments: {
        size: 1,
        first: () => ({ url: 'http://example.com/image.jpg' }),
      },
      reply: jest.fn(),
    };
    mockedAxios.post.mockResolvedValue({ data: { id: 'prediction-id' } });
    process.env.REPLICATE_WEBHOOK_URL = 'http://webhook.url';

    const result = await handleImageMessage(mockMessage);
    expect(result).toBe(true);
    expect(predictionImageMap.get('prediction-id')).toBe('http://example.com/image.jpg');
    expect(mockMessage.reply).not.toHaveBeenCalled();
  });

  it('should handle messages without attachments', async () => {
    const mockMessage = {
      channel: { id: 'test-channel-id' },
      attachments: { size: 0 },
    };
    const result = await handleImageMessage(mockMessage);
    expect(result).toBe(false);
  });

  it('should return false for messages in other channels', async () => {
    const mockMessage = {
      channel: { id: 'other-channel-id' },
    };
    const result = await handleImageMessage(mockMessage);
    expect(result).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    const mockMessage = {
      channel: { id: 'test-channel-id' },
      attachments: {
        size: 1,
        first: () => ({ url: 'http://example.com/image.jpg' }),
      },
    };
    mockedAxios.post.mockRejectedValue(new Error('API error'));
    const result = await handleImageMessage(mockMessage);
    expect(result).toBe(false);
  });
});

describe('createPrediction', () => {
  beforeEach(() => {
    mockedAxios.post.mockClear();
  });

  it('should create a prediction and return data', async () => {
    mockedAxios.post.mockResolvedValue({ data: { id: 'prediction-id' } });
    const result = await createPrediction('http://example.com/image.jpg');
    expect(result).toEqual({ id: 'prediction-id' });
    expect(mockedAxios.post).toHaveBeenCalled();
  });

  it('should throw an error when axios call fails', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Network error'));
    await expect(createPrediction('http://example.com/image.jpg')).rejects.toThrow(
      'Failed to create prediction'
    );
  });

  it('should set sync to true when REPLICATE_WEBHOOK_URL is not set', async () => {
    delete process.env.REPLICATE_WEBHOOK_URL;
    mockedAxios.post.mockResolvedValue({ data: {} });
    await createPrediction('http://example.com/image.jpg');
    const postData = mockedAxios.post.mock.calls[0][1] as any;
    expect(postData.sync).toBe(true);
  });

  it('should include webhook data when REPLICATE_WEBHOOK_URL is set', async () => {
    process.env.REPLICATE_WEBHOOK_URL = 'http://test.hook';
    mockedAxios.post.mockResolvedValue({ data: {} });
    await createPrediction('http://example.com/image.jpg');
    const postData = mockedAxios.post.mock.calls[0][1] as any;
    expect(postData.webhook).toBe('http://test.hook');
    expect(postData.webhook_events_filter).toEqual(['start', 'completed']);
  });
});
