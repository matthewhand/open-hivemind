import { handleError } from '../../../src/common/errors/handleError';
import { getRandomErrorMessage } from '../../../src/common/errors/getRandomErrorMessage';

jest.mock('../../../src/common/errors/getRandomErrorMessage');

// Mock console.error to verify logging
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('handleError', () => {
  beforeEach(() => {
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it('should log error message and stack trace', () => {
    const error = new Error('Test error');
    handleError(error);
    
    expect(mockConsoleError).toHaveBeenCalledWith('Error:', error.message);
    expect(mockConsoleError).toHaveBeenCalledWith('Stack:', error.stack);
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

  it('should handle errors without stack trace', () => {
    const error = { message: 'Error without stack' } as Error;
    handleError(error);
    
    expect(mockConsoleError).toHaveBeenCalledWith('Error:', 'Error without stack');
    expect(mockConsoleError).toHaveBeenCalledWith('Stack:', undefined);
  });

  it('should handle null/undefined errors gracefully', () => {
    handleError(null as any);
    expect(mockConsoleError).toHaveBeenCalled();
    
    handleError(undefined as any);
    expect(mockConsoleError).toHaveBeenCalled();
  });
});