import path from 'path';

// We will isolate modules and hard-stub dependencies to avoid config/axios side effects.
describe('openwebui/uploadKnowledgeFile', () => {
  const knowledgePath = path.join(__dirname, 'fixtures', 'knowledge.txt');

  const loadIsolated = (opts?: {
    exists?: boolean;
    axiosResolve?: any;
    axiosReject?: any;
    responseMissingId?: boolean;
    configuredPath?: string;
  }) => {
    jest.resetModules();

    const exists = opts?.exists ?? true;
    const configuredPath = opts?.configuredPath ?? knowledgePath;

    const axiosPost = jest.fn();
    if (opts?.axiosReject) {
      axiosPost.mockRejectedValue(opts.axiosReject);
    } else if (opts?.responseMissingId) {
      axiosPost.mockResolvedValue({ data: {} });
    } else if (opts?.axiosResolve) {
      axiosPost.mockResolvedValue(opts.axiosResolve);
    } else {
      axiosPost.mockResolvedValue({ data: { fileId: 'file-123' } });
    }

    // Mock debug: silence logs
    jest.doMock('debug', () => () => jest.fn());

    // Mock config with apiUrl and knowledgeFile
    jest.doMock('../../../src/integrations/openwebui/openWebUIConfig', () => ({
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
    jest.doMock('../../../src/integrations/openwebui/sessionManager', () => ({
      __esModule: true,
      getSessionKey: jest.fn().mockResolvedValue('sk-abc'),
    }));

    // Mock fs.existsSync and fs.createReadStream
    jest.doMock('fs', () => {
      const existsSync = jest.fn().mockReturnValue(exists);
      const createReadStream = jest.fn().mockReturnValue({ _fakeStream: true });
      return {
        __esModule: true,
        default: { existsSync, createReadStream },
        existsSync,
        createReadStream,
      };
    });

    // Mock axios to ensure both axios.post and axios.create().post use same mock
    jest.doMock('axios', () => {
      const axiosMock: any = { post: axiosPost };
      axiosMock.create = jest.fn(() => ({ post: axiosPost }));
      return { __esModule: true, default: axiosMock };
    });

    let mod: any;
    jest.isolateModules(() => {
      mod = require('../../../src/integrations/openwebui/uploadKnowledgeFile');
    });

    const axios = require('axios');
    const fs = require('fs');

    return {
      mod,
      axiosPost,
      axios,
      fs,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uploads the knowledge file and caches the returned fileId (happy path)', async () => {
    const { mod, axiosPost } = loadIsolated({
      exists: true,
      axiosResolve: { data: { fileId: 'file-xyz' } },
    });

    const { uploadKnowledgeFileOnStartup, getKnowledgeFileId } = mod;

    await uploadKnowledgeFileOnStartup();

    // Validate axios call
    expect(axiosPost).toHaveBeenCalledTimes(1);
    const [url, body, options] = axiosPost.mock.calls[0];
    // apiUrl ends with '/api/', session code appends '/v1/files' resulting in '/api//v1/files'
    expect(url).toMatch(/\/api\/\/v1\/files$/);
    // We pass the stream directly as body
    expect(body).toBeTruthy();
    expect(options).toEqual({
      headers: {
        Authorization: 'Bearer sk-abc',
        'Content-Type': 'multipart/form-data',
      },
    });

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

    await expect(uploadKnowledgeFileOnStartup()).rejects.toThrow(
      /Knowledge file does not exist/
    );
  });

  it('throws generic error when axios rejects', async () => {
    const { mod } = loadIsolated({
      exists: true,
      axiosReject: new Error('network issue'),
    });
    const { uploadKnowledgeFileOnStartup } = mod;

    await expect(uploadKnowledgeFileOnStartup()).rejects.toThrow(
      'Knowledge file upload failed'
    );
  });

  it('throws when API responds without fileId', async () => {
    const { mod } = loadIsolated({
      exists: true,
      responseMissingId: true,
    });
    const { uploadKnowledgeFileOnStartup } = mod;

    await expect(uploadKnowledgeFileOnStartup()).rejects.toThrow(
      'Knowledge file upload failed'
    );
  });

  it('getKnowledgeFileId throws if called before upload', () => {
    const { mod } = loadIsolated();
    const { getKnowledgeFileId } = mod;

    expect(() => getKnowledgeFileId()).toThrow(
      'Knowledge file ID is not available. Ensure the file is uploaded.'
    );
  });
});