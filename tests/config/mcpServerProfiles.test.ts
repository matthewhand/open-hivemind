// Mock fs and path before importing the module
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn()
}));

jest.mock('path', () => ({
    join: jest.fn((...args: string[]) => args.join('/')),
    dirname: jest.fn((p: string) => p.split('/').slice(0, -1).join('/'))
}));

import * as fs from 'fs';
import * as path from 'path';

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

// Helper to get fresh module imports
const getFreshModule = () => {
    // Clear the module cache
    jest.resetModules();
    
    // Re-mock after reset
    jest.mock('fs', () => ({
        existsSync: mockFs.existsSync,
        readFileSync: mockFs.readFileSync,
        writeFileSync: mockFs.writeFileSync,
        mkdirSync: mockFs.mkdirSync
    }));
    
    jest.mock('path', () => ({
        join: mockPath.join,
        dirname: mockPath.dirname
    }));
    
    // Require the module fresh
    return require('../../src/config/mcpServerProfiles');
};

describe('MCP Server Profiles Configuration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default mocks
        mockFs.existsSync.mockReturnValue(false);
        mockFs.readFileSync.mockReturnValue('[]');
        mockFs.writeFileSync.mockImplementation(() => {});
        mockFs.mkdirSync.mockImplementation(() => undefined);
        mockPath.join.mockImplementation((...args: string[]) => args.join('/'));
        mockPath.dirname.mockImplementation((p: string) => p.split('/').slice(0, -1).join('/'));
    });

    describe('loadMCPServerProfiles', () => {
        it('should return default profiles when file does not exist', () => {
            mockFs.existsSync.mockReturnValue(false);
            
            const { loadMCPServerProfiles } = getFreshModule();
            const profiles = loadMCPServerProfiles();
            
            expect(profiles.length).toBeGreaterThan(0);
            expect(profiles.find(p => p.key === 'none')).toBeDefined();
            expect(profiles.find(p => p.key === 'filesystem-readonly')).toBeDefined();
        });

        it('should load profiles from file when exists', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify([
                {
                    key: 'custom-profile',
                    name: 'Custom Profile',
                    servers: [{ name: 'server1', command: 'cmd', enabled: true }],
                    enabled: true
                }
            ]));

            const { loadMCPServerProfiles } = getFreshModule();
            const profiles = loadMCPServerProfiles();
            
            expect(profiles).toHaveLength(1);
            expect(profiles[0].key).toBe('custom-profile');
        });

        it('should return defaults on JSON parse error', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue('invalid json');

            const { loadMCPServerProfiles } = getFreshModule();
            const profiles = loadMCPServerProfiles();
            
            expect(profiles.length).toBeGreaterThan(0);
            expect(profiles[0].key).toBe('none'); // Default first profile
        });
    });

    describe('saveMCPServerProfiles', () => {
        it('should save profiles to file', () => {
            mockFs.existsSync.mockReturnValue(true);

            const { saveMCPServerProfiles } = getFreshModule();
            saveMCPServerProfiles([{ key: 'test', name: 'Test', servers: [], enabled: true }]);

            expect(mockFs.writeFileSync).toHaveBeenCalled();
            const savedData = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
            expect(savedData).toHaveLength(1);
            expect(savedData[0].key).toBe('test');
        });

        it('should create directory if it does not exist', () => {
            mockFs.existsSync.mockReturnValue(false);
            
            const { saveMCPServerProfiles } = getFreshModule();
            saveMCPServerProfiles([{ key: 'test', name: 'Test', servers: [], enabled: true }]);

            expect(mockFs.mkdirSync).toHaveBeenCalled();
        });
    });

    describe('getMCPServerProfileByKey', () => {
        it('should get profile by key', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify([
                { key: 'p1', name: 'Profile 1', servers: [], enabled: true }
            ]));

            const { getMCPServerProfileByKey } = getFreshModule();
            const profile = getMCPServerProfileByKey('p1');
            
            expect(profile).toBeDefined();
            expect(profile?.name).toBe('Profile 1');
        });

        it('should return undefined for non-existent key', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue('[]');

            const { getMCPServerProfileByKey } = getFreshModule();
            const profile = getMCPServerProfileByKey('non-existent');
            
            expect(profile).toBeUndefined();
        });

        it('should be case-insensitive', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify([
                { key: 'MyProfile', name: 'My Profile', servers: [], enabled: true }
            ]));

            const { getMCPServerProfileByKey } = getFreshModule();
            const profile = getMCPServerProfileByKey('myprofile');
            
            expect(profile).toBeDefined();
            expect(profile?.name).toBe('My Profile');
        });
    });

    describe('addMCPServerProfile', () => {
        it('should add new profile', () => {
            mockFs.existsSync.mockReturnValue(false);

            const { addMCPServerProfile } = getFreshModule();
            addMCPServerProfile({
                key: 'unique-new-profile',
                name: 'New Profile',
                servers: [],
                enabled: true
            });

            expect(mockFs.writeFileSync).toHaveBeenCalled();
            const savedData = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
            expect(savedData.find((p: { key: string }) => p.key === 'unique-new-profile')).toBeDefined();
        });

        it('should throw error when adding duplicate key', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify([{ key: 'existing-key', servers: [], enabled: true }]));

            const { addMCPServerProfile } = getFreshModule();
            
            expect(() => {
                addMCPServerProfile({ key: 'existing-key', name: 'Duplicate', servers: [], enabled: true });
            }).toThrow(/already exists/);
        });
    });

    describe('updateMCPServerProfile', () => {
        it('should update existing profile', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify([
                { key: 'p1', name: 'Original', servers: [], enabled: true }
            ]));

            const { updateMCPServerProfile } = getFreshModule();
            updateMCPServerProfile('p1', { name: 'Updated' });

            expect(mockFs.writeFileSync).toHaveBeenCalled();
            const savedData = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
            expect(savedData[0].name).toBe('Updated');
        });

        it('should throw error for non-existent key', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue('[]');

            const { updateMCPServerProfile } = getFreshModule();
            
            expect(() => {
                updateMCPServerProfile('non-existent', { name: 'Updated' });
            }).toThrow(/not found/);
        });
    });

    describe('deleteMCPServerProfile', () => {
        it('should delete profile', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify([
                { key: 'p1', name: 'Profile', servers: [], enabled: true }
            ]));

            const { deleteMCPServerProfile } = getFreshModule();
            deleteMCPServerProfile('p1');

            expect(mockFs.writeFileSync).toHaveBeenCalled();
            const savedData = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
            expect(savedData).toHaveLength(0);
        });

        it('should throw error for non-existent key', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue('[]');

            const { deleteMCPServerProfile } = getFreshModule();
            
            expect(() => {
                deleteMCPServerProfile('non-existent');
            }).toThrow(/not found/);
        });
    });

    describe('resolveMCPServers', () => {
        it('should resolve servers from single profile', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify([
                {
                    key: 'dev',
                    name: 'Dev Tools',
                    enabled: true,
                    servers: [
                        { name: 'git', command: 'git-server', enabled: true },
                        { name: 'fs', command: 'fs-server', enabled: true }
                    ]
                }
            ]));

            const { resolveMCPServers } = getFreshModule();
            const servers = resolveMCPServers('dev');
            
            expect(servers).toHaveLength(2);
            expect(servers.map(s => s.name)).toEqual(['git', 'fs']);
        });

        it('should merge servers from multiple profiles', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify([
                {
                    key: 'dev',
                    name: 'Dev Tools',
                    enabled: true,
                    servers: [
                        { name: 'git', command: 'git-server', enabled: true },
                        { name: 'fs', command: 'fs-server', enabled: true }
                    ]
                },
                {
                    key: 'research',
                    name: 'Research Tools',
                    enabled: true,
                    servers: [
                        { name: 'browser', command: 'browser-server', enabled: true },
                        { name: 'fs', command: 'fs-server-override', enabled: true }
                    ]
                }
            ]));

            const { resolveMCPServers } = getFreshModule();
            const servers = resolveMCPServers(['dev', 'research']);
            
            expect(servers).toHaveLength(3);
            expect(servers.map(s => s.name)).toEqual(['git', 'fs', 'browser']);
        });

        it('should ignore disabled profiles', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify([
                {
                    key: 'disabled',
                    name: 'Disabled Profile',
                    enabled: false,
                    servers: [{ name: 'secret', command: 'secret-server', enabled: true }]
                }
            ]));

            const { resolveMCPServers } = getFreshModule();
            const servers = resolveMCPServers('disabled');
            
            expect(servers).toHaveLength(0);
        });

        it('should handle non-existent profiles gracefully', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify([
                {
                    key: 'dev',
                    name: 'Dev Tools',
                    enabled: true,
                    servers: [
                        { name: 'git', command: 'git-server', enabled: true },
                        { name: 'fs', command: 'fs-server', enabled: true }
                    ]
                }
            ]));

            const { resolveMCPServers } = getFreshModule();
            const servers = resolveMCPServers(['dev', 'non-existent']);
            
            expect(servers).toHaveLength(2);
        });

        it('should handle empty input', () => {
            const { resolveMCPServers } = getFreshModule();
            const servers = resolveMCPServers('');
            
            expect(servers).toHaveLength(0);
        });

        it('should handle empty array input', () => {
            const { resolveMCPServers } = getFreshModule();
            const servers = resolveMCPServers([]);
            
            expect(servers).toHaveLength(0);
        });
    });
});
