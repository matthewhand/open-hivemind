import { handleError } from '../../../src/common/errors/handleError';
import { getRandomErrorMessage } from '../../../src/common/errors/getRandomErrorMessage';

jest.mock('../../../src/common/errors/getRandomErrorMessage');

describe('handleError', () => {
  it('should log error message and stack trace', () => {
    const error = new Error('Test error');
    handleError(error);
    // Additional assertions can be added here to verify logging if necessary
  });

  it('should send a random error message if messageChannel is provided', () => {
    const error = new Error('Test error');
    const sendMock = jest.fn();
    const messageChannel = { send: sendMock };

    (getRandomErrorMessage as jest.Mock).mockReturnValue('Random error message');

    handleError(error, messageChannel);

    expect(sendMock).toHaveBeenCalledWith('Random error message');
  });
});