import { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../../../src/server/middleware/auth';
import { ConfigurationManager } from '../../../src/config/ConfigurationManager';
import { AuthManager } from '../../../src/auth/AuthManager';

// Mock ConfigurationManager
jest.mock('../../../src/config/ConfigurationManager');
// Mock AuthManager
jest.mock('../../../src/auth/AuthManager');

describe('authenticateToken Middleware with IP Whitelist', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let mockConfigGet: jest.Mock;
    let mockGetUserPermissions: jest.Mock;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        mockReq = {
            headers: {},
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' } as any
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();

        // Setup ConfigurationManager mock
        mockConfigGet = jest.fn();
        (ConfigurationManager.getInstance as jest.Mock).mockReturnValue({
            getConfig: jest.fn().mockReturnValue({
                get: mockConfigGet
            })
        });

        // Setup AuthManager mock
        mockGetUserPermissions = jest.fn().mockReturnValue(['*']);
        (AuthManager.getInstance as jest.Mock).mockReturnValue({
            getUserPermissions: mockGetUserPermissions,
            verifyAccessToken: jest.fn()
        });
    });

    it('should bypass auth if IP is whitelisted', () => {
        // Setup whitelist
        mockConfigGet.mockReturnValue('127.0.0.1');

        authenticateToken(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.user).toBeDefined();
        expect(mockReq.user?.role).toBe('admin');
        expect(mockReq.user?.userId).toBe('system-whitelist');
    });

    it('should NOT bypass auth if IP is NOT whitelisted', () => {
        // Setup whitelist with different IP
        mockConfigGet.mockReturnValue('10.0.0.1');

        // No auth header
        authenticateToken(mockReq as Request, mockRes as Response, mockNext);

        // Should return 401 because verifyAccessToken fails/is skipped and no token exists
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should proceed to normal auth if no whitelist configured', () => {
        mockConfigGet.mockReturnValue(''); // No whitelist

        // No auth header
        authenticateToken(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should handle CIDR whitelist', () => {
        mockConfigGet.mockReturnValue('127.0.0.0/8');

        authenticateToken(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.user?.userId).toBe('system-whitelist');
    });
});
