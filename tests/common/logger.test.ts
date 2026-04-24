import Logger from '../../src/common/logger';
import databaseConfig from '../../src/config/databaseConfig';
import { DatabaseManager } from '../../src/database/DatabaseManager';

jest.mock('../../src/config/databaseConfig');
jest.mock('../../src/database/DatabaseManager');

describe('Logger Persistence', () => {
  let dbManagerMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    dbManagerMock = {
      isConnected: jest.fn().mockReturnValue(true),
      saveLog: jest.fn().mockResolvedValue(undefined),
    };
    
    (DatabaseManager.getInstance as jest.Mock).mockReturnValue(dbManagerMock);
  });

  it('should call dbManager.saveLog when LOG_TO_DATABASE is true', () => {
    (databaseConfig.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'LOG_TO_DATABASE') return true;
      return undefined;
    });

    Logger.info('Test persistent log');

    expect(dbManagerMock.saveLog).toHaveBeenCalledWith(expect.objectContaining({
      level: 'info',
      message: expect.stringContaining('Test persistent log'),
    }));
  });

  it('should not call dbManager.saveLog when LOG_TO_DATABASE is false', () => {
    (databaseConfig.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'LOG_TO_DATABASE') return false;
      return undefined;
    });

    Logger.info('Test non-persistent log');

    expect(dbManagerMock.saveLog).not.toHaveBeenCalled();
  });
});
