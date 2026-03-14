import { SlackInstanceFactory } from './core/SlackInstanceFactory';
import { create, manifest } from './index';

jest.mock('./core/SlackInstanceFactory');
jest.mock('./SlackService', () => ({
  default: { getInstance: jest.fn().mockReturnValue({}) },
  __esModule: true,
}));
jest.mock('./SlackBotManager');
jest.mock('@src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn().mockReturnValue({ getAllBots: jest.fn().mockReturnValue([]) }),
  },
}));

describe('message-slack', () => {
  it('create() returns a value', () => {
    const result = create({});
    expect(result).toBeDefined();
  });

  it('manifest type is message', () => {
    expect(manifest.type).toBe('message');
  });
});
