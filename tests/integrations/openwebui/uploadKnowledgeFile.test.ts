import path from 'path';

// We will isolate modules and hard-stub dependencies to avoid config/axios side effects.
describe('openwebui/uploadKnowledgeFile', () => {
  const knowledgePath = path.join(__dirname, 'fixtures', 'knowledge.txt');

  const loadIsolated = (opts?: {
    exists?: boolean;
    httpResolve?: any;
    httpReject?: any;
    responseMissingId?: boolean;
    configuredPath?: string;
  }) => {
    jest.resetModules();

    const exists = opts?.exists ?? true;
    const configuredPath = opts?.configuredPath ?? knowledgePath;

    const httpPost = jest.fn();
    if (opts?.httpReject) {
      httpPost.mockRejectedValue(opts.httpReject);
    } else if (opts?.responseMissingId) {
      httpPost.mockResolvedValue({});
    } else if (opts?.httpResolve) {
      httpPost.mockResolvedValue(opts.httpResolve);
    } else {
      httpPost.mockResolvedValue({ fileId: 'file-123' });
    }

    // Mock debug: silence logs
    jest.doMock('debug', () => () => jest.fn());

    // Mock config with apiUrl and knowledgeFile
    jest.doMock('@integrations/openwebui/openWebUIConfig', () => ({
      __esModule: true,
      default: {
        getProperties: () => ({
          apiUrl: 'http://host.docker.internal:3000/api/',
          username: 'admin',
          password: 'password123',
          knowledgeFile: configuredPath,
          model: 'llama3.2',
        }),
      },
    }));

    // Mock sessionManager.getSessionKey to return a stable token
    jest.doMock(
      '@integrations/openwebui/sessionManager',
      () => ({
        __esModule: true,
        getSessionKey: jest.fn().mockResolvedValue('sk-abc'),
      }),
      { virtual: true }
    );

    // Mock fs with existsSync and createReadStream
    jest.doMock('fs', () => {
      return {
        __esModule: true,
        default: {
          existsSync: exists ? jest.fn().mockReturnValue(true) : jest.fn().mockReturnValue(false),
          createReadStream: jest.fn().mockReturnValue({ _fakeStream: true }),
          constants: { F_OK: 0 },
        },
        existsSync: exists ? jest.fn().mockReturnValue(true) : jest.fn().mockReturnValue(false),
        createReadStream: jest.fn().mockReturnValue({ _fakeStream: true }),
        constants: { F_OK: 0 },
      };
    });

    // Mock @hivemind/shared-types http
    jest.doMock('@hivemind/shared-types', () => ({
      http: {
        post: httpPost,
        get: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
      },
    }));

    let mod: any;
    jest.isolateModules(() => {
      mod = require('@integrations/openwebui/uploadKnowledgeFile');
    });

    return {
      mod,
      httpPost,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uploads the knowledge file and caches the returned fileId (happy path)', async () => {
    const { mod, httpPost } = loadIsolated({
      exists: true,
      httpResolve: { fileId: 'file-xyz' },
    });

    const { uploadKnowledgeFileOnStartup, getKnowledgeFileId } = mod;

    await uploadKnowledgeFileOnStartup();

    // Validate http.post call
    expect(httpPost).toHaveBeenCalledTimes(1);
    const [url, body, options] = httpPost.mock.calls[0];
    expect(url).toMatch(/\/v1\/files$/);
    expect(body).toBeDefined();
    expect(options).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-abc',
          'Content-Type': 'multipart/form-data',
        }),
        timeout: 30000,
      })
    );

    // Cached id is retrievable
    expect(getKnowledgeFileId()).toBe('file-xyz');
  });

  it('throws when knowledge file path is missing in config', async () => {
    const { mod } = loadIsolated({
      configuredPath: '',
    });
    const { uploadKnowledgeFileOnStartup } = mod;

    await expect(uploadKnowledgeFileOnStartup()).rejects.toThrow(
      'Knowledge file path is missing in the configuration.'
    );
  });

  it('throws when knowledge file does not exist', async () => {
    const { mod } = loadIsolated({
      exists: false,
    });
    const { uploadKnowledgeFileOnStartup } = mod;

    await expect(uploadKnowledgeFileOnStartup()).rejects.toThrow(/Knowledge file does not exist/);
  });

  it('throws generic error when http rejects', async () => {
    const { mod } = loadIsolated({
      exists: true,
      httpReject: new Error('network issue'),
    });
    const { uploadKnowledgeFileOnStartup } = mod;

    await expect(uploadKnowledgeFileOnStartup()).rejects.toThrow('Knowledge file upload failed');
  });

  it('throws when API responds without fileId', async () => {
    const { mod } = loadIsolated({
      exists: true,
      responseMissingId: true,
    });
    const { uploadKnowledgeFileOnStartup } = mod;

    await expect(uploadKnowledgeFileOnStartup()).rejects.toThrow('Knowledge file upload failed');
  });

  it('getKnowledgeFileId throws if called before upload', () => {
    const { mod } = loadIsolated();
    const { getKnowledgeFileId } = mod;

    expect(() => getKnowledgeFileId()).toThrow(
      'Knowledge file ID is not available. Ensure the file is uploaded.'
    );
  });
});
