import {
    loadMCPServerProfiles,
    saveMCPServerProfiles,
    getMCPServerProfileByKey,
    addMCPServerProfile,
    updateMCPServerProfile,
    deleteMCPServerProfile,
    resolveMCPServers,
    MCPServerProfile
} from '../../src/config/mcpServerProfiles';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs and path
jest.mock('fs');
jest.mock('path');

describe('MCP Server Profiles Configuration', () => {
    const mockFs = fs as jest.Mocked<typeof fs>;
    const mockPath = path as jest.Mocked<typeof path>;

    beforeEach(() => {
        jest.resetAllMocks();
        mockPath.join.mockImplementation((...args) => args.join('/'));
        mockPath.dirname.mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
        mockFs.existsSync.mockReturnValue(false);
    });

    describe('loadMCPServerProfiles', () => {
        it('should return default profiles when file does not exist', () => {
            const profiles = loadMCPServerProfiles();
            expect(profiles.length).toBeGreaterThan(0);
            expect(profiles.find(p => p.key === 'none')).toBeDefined();
            expect(profiles.find(p => p.key === 'filesystem-readonly')).toBeDefined();
        });

        it('should load profiles from file when exists', () => {
            mockFs.existsSync.mockReturnValue(true);
            const mockProfiles: MCPServerProfile[] = [
                {
                    key: 'custom-profile',
                    name: 'Custom Profile',
                    servers: [{ name: 'server1', command: 'cmd', enabled: true }],
                    enabled: true
                }
            ];
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProfiles));

            const profiles = loadMCPServerProfiles();
            expect(profiles).toHaveLength(1);
            expect(profiles[0].key).toBe('custom-profile');
        });

        it('should return defaults on JSON parse error', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue('invalid json');

            const profiles = loadMCPServerProfiles();
            expect(profiles.length).toBeGreaterThan(0);
            expect(profiles[0].key).toBe('none'); // Default first profile
        });
    });

    describe('CRUD Operations', () => {
        it('should get profile by key', () => {
            mockFs.existsSync.mockReturnValue(true);
            const mockProfiles: MCPServerProfile[] = [
                { key: 'p1', name: 'Profile 1', servers: [], enabled: true }
            ];
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProfiles));

            const profile = getMCPServerProfileByKey('p1');
            expect(profile).toBeDefined();
            expect(profile?.name).toBe('Profile 1');

            const nonExistent = getMCPServerProfileByKey('p2');
            expect(nonExistent).toBeUndefined();
        });

        it('should add new profile', () => {
            mockFs.existsSync.mockReturnValue(false); // Will load defaults initially

            const newProfile: MCPServerProfile = {
                key: 'new-profile',
                name: 'New Profile',
                servers: [],
                enabled: true
            };

            addMCPServerProfile(newProfile);

            expect(mockFs.writeFileSync).toHaveBeenCalled();
            const savedData = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
            expect(savedData.find((p: any) => p.key === 'new-profile')).toBeDefined();
        });

        it('should throw error when adding duplicate key', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify([{ key: 'p1', servers: [], enabled: true }]));

            expect(() => {
                addMCPServerProfile({ key: 'p1', name: 'Duplicate', servers: [], enabled: true });
            }).toThrow();
        });

        it('should update existing profile', () => {
            mockFs.existsSync.mockReturnValue(true);
            const mockProfiles = [{ key: 'p1', name: 'Original', servers: [], enabled: true }];
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProfiles));

            updateMCPServerProfile('p1', { name: 'Updated' });

            expect(mockFs.writeFileSync).toHaveBeenCalled();
            const savedData = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
            expect(savedData[0].name).toBe('Updated');
        });

        it('should delete profile', () => {
            mockFs.existsSync.mockReturnValue(true);
            const mockProfiles = [{ key: 'p1', servers: [], enabled: true }];
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProfiles));

            deleteMCPServerProfile('p1');

            expect(mockFs.writeFileSync).toHaveBeenCalled();
            const savedData = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
            expect(savedData).toHaveLength(0);
        });
    });

    describe('resolveMCPServers', () => {
        const mockProfiles: MCPServerProfile[] = [
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
                    { name: 'fs', command: 'fs-server-override', enabled: true } // Duplicate name
                ]
            },
            {
                key: 'disabled',
                name: 'Disabled Profile',
                enabled: false,
                servers: [{ name: 'secret', command: 'secret-server', enabled: true }]
            }
        ];

        beforeEach(() => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProfiles));
        });

        it('should resolve servers from single profile', () => {
            const servers = resolveMCPServers('dev');
            expect(servers).toHaveLength(2);
            expect(servers.map(s => s.name)).toEqual(['git', 'fs']);
        });

        it('should merge servers from multiple profiles', () => {
            const servers = resolveMCPServers(['dev', 'research']);
            expect(servers).toHaveLength(3); // git, fs, browser (fs duplicate ignored)
            expect(servers.map(s => s.name)).toEqual(['git', 'fs', 'browser']);
        });

        it('should ignore disabled profiles', () => {
            const servers = resolveMCPServers('disabled');
            expect(servers).toHaveLength(0);
        });

        it('should handle non-existent profiles gracefully', () => {
            const servers = resolveMCPServers(['dev', 'non-existent']);
            expect(servers).toHaveLength(2); // Only dev servers
        });
    });
});
