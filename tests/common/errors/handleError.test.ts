import { handleError } from '../../../src/common/errors/handleError';
import { getRandomErrorMessage } from '../../../src/common/errors/getRandomErrorMessage';

jest.mock('../../../src/common/errors/getRandomErrorMessage');
jest.mock('debug', () => jest.fn(() => jest.fn()));

describe('handleError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send a random error message if messageChannel is provided', () => {
    const error = new Error('Test error');
    const sendMock = jest.fn();
    const messageChannel = { send: sendMock };

    (getRandomErrorMessage as jest.Mock).mockReturnValue('Random error message');

    handleError(error, messageChannel);

    expect(sendMock).toHaveBeenCalledWith('Random error message');
    expect(getRandomErrorMessage).toHaveBeenCalled();
  });

  it('should not send message if no messageChannel provided', () => {
    const error = new Error('Test error');
    
    expect(() => handleError(error)).not.toThrow();
  });

  it('should not send message if messageChannel has no send method', () => {
    const error = new Error('Test error');
    const messageChannel = { notSend: jest.fn() };
    
    expect(() => handleError(error, messageChannel)).not.toThrow();
  });

  it('should handle null/undefined errors gracefully', () => {
    expect(() => handleError(null as any)).not.toThrow();
    expect(() => handleError(undefined as any)).not.toThrow();
  });
});