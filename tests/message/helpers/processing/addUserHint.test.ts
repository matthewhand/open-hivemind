import { addUserHint } from '../../../../src/message/helpers/processing/addUserHint';
import messageConfig from '../../../../src/message/interfaces/messageConfig';

jest.mock('../../../../src/message/interfaces/messageConfig', () => ({
    get: jest.fn(),
}));

describe('addUserHint', () => {
    const userId = 'user123';
    const botId = 'bot456';
    const originalMessage = 'Hello <@bot456>, how are you?';

    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('should add user hint when MESSAGE_ADD_USER_HINT is true', () => {
        (messageConfig.get as jest.Mock).mockReturnValue(true);
        const expectedMessage = 'Hello (from <@user123>), how are you?';
        const result = addUserHint(originalMessage, userId, botId);
        expect(result).toBe(expectedMessage);
    });

    it('should not add user hint when MESSAGE_ADD_USER_HINT is false', () => {
        (messageConfig.get as jest.Mock).mockReturnValue(false);
        const result = addUserHint(originalMessage, userId, botId);
        expect(result).toBe(originalMessage);
    });

    it('should handle multiple bot mentions', () => {
        (messageConfig.get as jest.Mock).mockReturnValue(true);
        const message = 'Hello <@bot456>, please forward to <@bot456>';
        const expected = 'Hello (from <@user123>), please forward to (from <@user123>)';
        const result = addUserHint(message, userId, botId);
        expect(result).toBe(expected);
    });

    it('should return original message if botId not found', () => {
        (messageConfig.get as jest.Mock).mockReturnValue(true);
        const message = 'Hello everyone, how are you?';
        const result = addUserHint(message, userId, botId);
        expect(result).toBe(message);
    });
});