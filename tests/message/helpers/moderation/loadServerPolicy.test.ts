
import loadServerPolicy from '../../../../src/message/helpers/moderation/loadServerPolicy';
import fs from 'fs';
import path from 'path';

jest.mock('fs');
jest.mock('path');

describe('loadServerPolicy', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (path.resolve as jest.Mock).mockReturnValue('/mock/path/serverPolicy.json');
    });

    it('should return policy data when file exists', () => {
        (fs.readFileSync as jest.Mock).mockReturnValue('{"policy": "strict"}');

        const policy = loadServerPolicy();
        expect(policy).toBe('{"policy": "strict"}');
        expect(fs.readFileSync).toHaveBeenCalledWith('/mock/path/serverPolicy.json', 'utf-8');
    });

    it('should throw error when file read fails', () => {
        (fs.readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('File not found');
        });

        expect(() => loadServerPolicy()).toThrow('Unable to load server policy.');
    });
});
