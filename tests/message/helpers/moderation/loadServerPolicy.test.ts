import fs from 'fs';
import path from 'path';
import loadServerPolicy from '../../../../src/message/helpers/moderation/loadServerPolicy';

jest.mock('path');

describe('loadServerPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (path.resolve as jest.Mock).mockReturnValue('/mock/path/serverPolicy.json');
  });

  it('should return policy data when file exists', async () => {
    jest.spyOn(fs.promises, 'readFile').mockResolvedValue('{"policy": "strict"}');

    const policy = await loadServerPolicy();
    expect(policy).toBe('{"policy": "strict"}');
    expect(fs.promises.readFile).toHaveBeenCalledWith('/mock/path/serverPolicy.json', 'utf-8');
  });

  it('should throw error when file read fails', async () => {
    jest.spyOn(fs.promises, 'readFile').mockRejectedValue(new Error('File not found'));

    await expect(loadServerPolicy()).rejects.toThrow('Unable to load server policy.');
  });
});
