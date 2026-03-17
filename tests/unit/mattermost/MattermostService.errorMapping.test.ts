import { MattermostService } from '../../../packages/message-mattermost/src/MattermostService';
import { NetworkError, ValidationError } from '../../../src/types/errorClasses';

describe('MattermostService Error Mapping', () => {
  let mockClient: any;
  let service: any;

  beforeEach(() => {
    mockClient = {
      postMessage: jest.fn(),
    };

    service = new MattermostService({} as any, {} as any);
    (service as any).clients.set('test-bot', mockClient);
  });

  it('should map 404 to ValidationError', async () => {
    mockClient.postMessage.mockRejectedValue({ status: 404, message: 'Not Found' });

    await expect(service.sendMessageToChannel('C123', 'test')).rejects.toThrow(ValidationError);
  });

  it('should map 502 to NetworkError', async () => {
    mockClient.postMessage.mockRejectedValue({ status: 502, message: 'Bad Gateway' });

    await expect(service.sendMessageToChannel('C123', 'test')).rejects.toThrow(NetworkError);
  });
});
