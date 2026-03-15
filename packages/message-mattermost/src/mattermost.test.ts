import { create, manifest } from './index';
import { MattermostService } from './MattermostService';

jest.mock('./MattermostService', () => ({
  MattermostService: {
    getInstance: jest.fn().mockReturnValue({
      initialize: jest.fn().mockResolvedValue(undefined),
      sendMessageToChannel: jest.fn().mockResolvedValue(undefined),
      setApp: jest.fn(),
      setMessageHandler: jest.fn(),
    }),
  },
}));

jest.mock('@src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn().mockReturnValue({ getAllBots: jest.fn().mockReturnValue([]) }),
  },
}));

describe('message-mattermost', () => {
  it('create() returns a MattermostService instance', () => {
    const instance = create({} as any);
    expect(MattermostService.getInstance).toHaveBeenCalled();
    expect(instance).toBeDefined();
  });

  it('manifest type is message', () => {
    expect(manifest.type).toBe('message');
  });
});
