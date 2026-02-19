import { VoiceCommandHandler } from '@hivemind/adapter-discord/voice/voiceCommandHandler';
import { VoiceConnection } from '@discordjs/voice';

jest.mock('@hivemind/adapter-discord/voice/speechToText');
jest.mock('@hivemind/adapter-discord/media/convertOpusToWav');
jest.mock('@src/llm/getLlmProvider');
jest.mock('openai');
jest.mock('fs');

describe('VoiceCommandHandler', () => {
  let handler: VoiceCommandHandler;
  let mockConnection: jest.Mocked<VoiceConnection>;

  beforeEach(() => {
    mockConnection = {} as jest.Mocked<VoiceConnection>;
    handler = new VoiceCommandHandler(mockConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle listening states and voice processing', async () => {
    // Test start/stop listening
    handler.startListening();
    expect(handler['isListening']).toBe(true);

    handler.stopListening();
    expect(handler['isListening']).toBe(false);

    // Reset mocks for voice processing test
    jest.clearAllMocks();

    // Test voice processing when listening
    const { transcribeAudio } = require('@hivemind/adapter-discord/voice/speechToText');
    const { convertOpusToWav } = require('@hivemind/adapter-discord/media/convertOpusToWav');
    const { getLlmProvider } = require('@src/llm/getLlmProvider');

    transcribeAudio.mockResolvedValue('Hello bot');
    convertOpusToWav.mockResolvedValue('/temp/audio.wav');
    getLlmProvider.mockReturnValue([{
      generateChatCompletion: jest.fn().mockResolvedValue('Hello human')
    }]);

    const fs = require('fs');
    fs.existsSync = jest.fn().mockReturnValue(false);
    fs.mkdirSync = jest.fn();
    fs.unlinkSync = jest.fn();

    handler.startListening();
    const opusBuffer = Buffer.from('opus data');

    await handler.processVoiceInput(opusBuffer);

    expect(convertOpusToWav).toHaveBeenCalledWith(opusBuffer, './temp');
    expect(transcribeAudio).toHaveBeenCalledWith('/temp/audio.wav');

    // Reset mocks for next test
    jest.clearAllMocks();

    // Test ignoring input when not listening
    handler.stopListening();
    await handler.processVoiceInput(opusBuffer);
    expect(convertOpusToWav).not.toHaveBeenCalled();

    // Reset mocks for final test
    jest.clearAllMocks();

    // Test empty transcription handling
    transcribeAudio.mockResolvedValue('   ');
    convertOpusToWav.mockResolvedValue('/temp/audio.wav');

    fs.existsSync = jest.fn().mockReturnValue(false);
    fs.mkdirSync = jest.fn();
    fs.unlinkSync = jest.fn();

    handler.startListening();
    await handler.processVoiceInput(Buffer.from('opus'));

    expect(fs.unlinkSync).toHaveBeenCalledWith('/temp/audio.wav');
  });
});