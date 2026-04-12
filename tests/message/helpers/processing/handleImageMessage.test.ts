import {
  createPrediction,
  handleImageMessage,
  predictionImageMap,
} from '@message/helpers/processing/handleImageMessage';

// Mock the http client used by handleImageMessage
jest.mock('@src/utils/httpClient', () => ({
  http: {
    post: jest.fn(),
    get: jest.fn(),
  },
  createHttpClient: jest.fn(),
  isHttpError: jest.fn(() => false),
}));

const { http } = require('@src/utils/httpClient');
const mockedHttpPost = http.post as jest.Mock;

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
    mockedHttpPost.mockResolvedValue({ id: 'prediction-id' });
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
    mockedHttpPost.mockRejectedValue(new Error('API error'));
    const result = await handleImageMessage(mockMessage);
    expect(result).toBe(false);
  });
});

describe('createPrediction', () => {
  beforeEach(() => {
    mockedHttpPost.mockClear();
  });

  it('should create a prediction and return data', async () => {
    mockedHttpPost.mockResolvedValue({ id: 'prediction-id' });
    const result = await createPrediction('http://example.com/image.jpg');
    expect(result).toEqual({ id: 'prediction-id' });
    expect(mockedHttpPost).toHaveBeenCalled();
  });

  it('should throw an error when http call fails', async () => {
    mockedHttpPost.mockRejectedValue(new Error('Network error'));
    await expect(createPrediction('http://example.com/image.jpg')).rejects.toThrow(
      'Failed to create prediction'
    );
  });

  it('should set sync to true when REPLICATE_WEBHOOK_URL is not set', async () => {
    delete process.env.REPLICATE_WEBHOOK_URL;
    mockedHttpPost.mockResolvedValue({});
    await createPrediction('http://example.com/image.jpg');
    const postData = mockedHttpPost.mock.calls[0][1] as any;
    expect(postData.sync).toBe(true);
  });

  it('should include webhook data when REPLICATE_WEBHOOK_URL is set', async () => {
    process.env.REPLICATE_WEBHOOK_URL = 'http://test.hook';
    mockedHttpPost.mockResolvedValue({});
    await createPrediction('http://example.com/image.jpg');
    const postData = mockedHttpPost.mock.calls[0][1] as any;
    expect(postData.webhook).toBe('http://test.hook');
    expect(postData.webhook_events_filter).toEqual(['start', 'completed']);
  });
});
