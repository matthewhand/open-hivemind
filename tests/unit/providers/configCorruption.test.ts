import * as fs from 'fs';
import { DiscordProvider } from '../../../src/providers/DiscordProvider';
import { SlackProvider } from '../../../src/providers/SlackProvider';

/**
 * addBot() persists to config/providers/messengers.json. If that file exists
 * but is corrupted (invalid JSON), the provider must surface the error rather
 * than silently overwriting it with a fresh default — which would destroy every
 * existing bot configuration. These tests assert addBot rejects with a clear
 * "corrupted" error and never reaches the writeFile step.
 */
describe('messenger provider config-corruption safety', () => {
  let readFileSpy: jest.SpyInstance;
  let writeFileSpy: jest.SpyInstance;

  beforeEach(() => {
    // Existing file with invalid JSON content.
    readFileSpy = jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue('{ this is : not valid json' as never);
    writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined as never);
    jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('SlackProvider.addBot rejects on a corrupted messengers.json and does not overwrite it', async () => {
    const provider = new SlackProvider({} as never);
    await expect(
      provider.addBot({ name: 'b1', botToken: 'x', signingSecret: 's' })
    ).rejects.toThrow(/corrupted/i);
    expect(readFileSpy).toHaveBeenCalled();
    expect(writeFileSpy).not.toHaveBeenCalled();
  });

  it('DiscordProvider.addBot rejects on a corrupted messengers.json and does not overwrite it', async () => {
    const provider = new DiscordProvider({} as never);
    await expect(provider.addBot({ name: 'b1', token: 'x' })).rejects.toThrow(/corrupted/i);
    expect(readFileSpy).toHaveBeenCalled();
    expect(writeFileSpy).not.toHaveBeenCalled();
  });
});
