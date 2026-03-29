import { Request, Response } from 'express';
import { providerRegistry } from '../../../src/registries/ProviderRegistry';
import providersRouter from '../../../src/server/routes/providers';

// Mock the providerRegistry
jest.mock('../../../src/registries/ProviderRegistry', () => ({
  providerRegistry: {
    getMemoryProviders: jest.fn(),
    getToolProviders: jest.fn(),
  },
}));

describe('providers router - /health', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRequest = {};
    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };
    jest.clearAllMocks();
  });

  it('should return health status for memory and tool providers successfully', async () => {
    // Setup mocks
    const mockMemoryProviders = new Map([
      ['memory-1', { id: 'm1' }],
      ['memory-2', { id: 'm2' }],
    ]);
    const mockToolProviders = new Map([
      ['tool-1', { id: 't1' }],
    ]);

    (providerRegistry.getMemoryProviders as jest.Mock).mockReturnValue(mockMemoryProviders);
    (providerRegistry.getToolProviders as jest.Mock).mockReturnValue(mockToolProviders);

    // Find the /health handler
    const healthRoute = providersRouter.stack.find(
      (layer) => layer.route && layer.route.path === '/health'
    );
    expect(healthRoute).toBeDefined();

    // Call the handler
    await healthRoute.route.stack[0].handle(mockRequest as Request, mockResponse as Response, jest.fn());

    expect(jsonMock).toHaveBeenCalledTimes(1);
    const responseData = jsonMock.mock.calls[0][0];

    expect(responseData).toMatchObject({
      status: 'healthy',
      providers: {
        memory: [
          { name: 'memory-1', id: 'm1', status: 'active' },
          { name: 'memory-2', id: 'm2', status: 'active' },
        ],
        tools: [
          { name: 'tool-1', id: 't1', status: 'active' },
        ]
      }
    });
    expect(responseData.timestamp).toBeDefined();
  });

  it('should handle errors gracefully and return 500', async () => {
    (providerRegistry.getMemoryProviders as jest.Mock).mockImplementation(() => {
      throw new Error('Registry failed');
    });

    // Find the /health handler
    const healthRoute = providersRouter.stack.find(
      (layer) => layer.route && layer.route.path === '/health'
    );

    // Call the handler
    await healthRoute.route.stack[0].handle(mockRequest as Request, mockResponse as Response, jest.fn());

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Failed to retrieve provider health',
      message: 'Registry failed',
    });
  });
});
