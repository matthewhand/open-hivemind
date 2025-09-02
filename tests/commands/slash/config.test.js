// tests/commands/slash/config.test.js
const { execute } = require('../../../src/commands/slash/config');
const configManager = require('../../../src/config/configurationManager');
const permissions = require('../../../src/utils/permissions');

jest.mock('../../../src/config/configurationManager');
jest.mock('../../../src/utils/permissions', () => ({
    isUserAllowed: jest.fn(),
    isRoleAllowed: jest.fn()
}));

describe('/config command', () => {
    let mockInteraction;
    let mockConfigManager;
    let mockPermissions;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup comprehensive mock interaction
        mockInteraction = {
            options: {
                getString: jest.fn(),
                getSubcommand: jest.fn(),
                getBoolean: jest.fn(),
                getInteger: jest.fn()
            },
            reply: jest.fn().mockResolvedValue(undefined),
            editReply: jest.fn().mockResolvedValue(undefined),
            followUp: jest.fn().mockResolvedValue(undefined),
            deferReply: jest.fn().mockResolvedValue(undefined),
            user: { 
                id: '123456789',
                username: 'testuser',
                discriminator: '0001'
            },
            member: { 
                roles: { 
                    cache: new Map([
                        ['admin-role-id', { name: 'Admin', id: 'admin-role-id' }]
                    ])
                },
                permissions: {
                    has: jest.fn().mockReturnValue(true)
                }
            },
            guild: {
                id: 'test-guild-id',
                name: 'Test Guild'
            },
            channel: {
                id: 'test-channel-id',
                name: 'test-channel'
            }
        };

        // Setup config manager mock
        mockConfigManager = {
            get: jest.fn(),
            set: jest.fn(),
            getAll: jest.fn().mockReturnValue({}),
            reload: jest.fn(),
            validate: jest.fn().mockReturnValue({ valid: true, errors: [] })
        };
        configManager.mockReturnValue(mockConfigManager);

        // Setup permissions mock
        mockPermissions = permissions;
        mockPermissions.isUserAllowed.mockReturnValue(true);
        mockPermissions.isRoleAllowed.mockReturnValue(true);
    });

    describe('Command execution', () => {
        it('should execute config view subcommand successfully', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('view');
            mockConfigManager.getAll.mockReturnValue({
                MESSAGE_PROVIDER: 'discord',
                LLM_PROVIDER: 'openai',
                DEBUG: 'false'
            });

            await execute(mockInteraction);

            expect(mockInteraction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('Current Configuration'),
                    ephemeral: true
                })
            );
        });

        it('should execute config set subcommand successfully', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('set');
            mockInteraction.options.getString.mockImplementation((key) => {
                if (key === 'key') return 'DEBUG';
                if (key === 'value') return 'true';
                return null;
            });

            await execute(mockInteraction);

            expect(mockConfigManager.set).toHaveBeenCalledWith('DEBUG', 'true');
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('Configuration updated'),
                    ephemeral: true
                })
            );
        });

        it('should execute config get subcommand successfully', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('get');
            mockInteraction.options.getString.mockReturnValue('MESSAGE_PROVIDER');
            mockConfigManager.get.mockReturnValue('discord');

            await execute(mockInteraction);

            expect(mockConfigManager.get).toHaveBeenCalledWith('MESSAGE_PROVIDER');
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('MESSAGE_PROVIDER: discord'),
                    ephemeral: true
                })
            );
        });

        it('should execute config reload subcommand successfully', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('reload');

            await execute(mockInteraction);

            expect(mockConfigManager.reload).toHaveBeenCalled();
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('Configuration reloaded'),
                    ephemeral: true
                })
            );
        });
    });

    describe('Permission handling', () => {
        it('should deny access when user lacks permissions', async () => {
            mockPermissions.isUserAllowed.mockReturnValue(false);
            mockPermissions.isRoleAllowed.mockReturnValue(false);

            await execute(mockInteraction);

            expect(mockInteraction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('permission'),
                    ephemeral: true
                })
            );
        });

        it('should allow access with user permissions', async () => {
            mockPermissions.isUserAllowed.mockReturnValue(true);
            mockPermissions.isRoleAllowed.mockReturnValue(false);
            mockInteraction.options.getSubcommand.mockReturnValue('view');

            await execute(mockInteraction);

            expect(mockInteraction.reply).toHaveBeenCalled();
            expect(mockInteraction.reply).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('permission')
                })
            );
        });

        it('should allow access with role permissions', async () => {
            mockPermissions.isUserAllowed.mockReturnValue(false);
            mockPermissions.isRoleAllowed.mockReturnValue(true);
            mockInteraction.options.getSubcommand.mockReturnValue('view');

            await execute(mockInteraction);

            expect(mockInteraction.reply).toHaveBeenCalled();
            expect(mockInteraction.reply).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('permission')
                })
            );
        });
    });

    describe('Error handling', () => {
        it('should handle config manager errors gracefully', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('view');
            mockConfigManager.getAll.mockImplementation(() => {
                throw new Error('Config access failed');
            });

            await execute(mockInteraction);

            expect(mockInteraction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('error'),
                    ephemeral: true
                })
            );
        });

        it('should handle invalid subcommands', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('invalid');

            await execute(mockInteraction);

            expect(mockInteraction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('Unknown subcommand'),
                    ephemeral: true
                })
            );
        });

        it('should handle missing required parameters', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('set');
            mockInteraction.options.getString.mockImplementation((key) => {
                if (key === 'key') return null; // Missing key
                if (key === 'value') return 'true';
                return null;
            });

            await execute(mockInteraction);

            expect(mockInteraction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('required'),
                    ephemeral: true
                })
            );
        });
    });

    describe('Configuration validation', () => {
        it('should validate configuration before setting', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('set');
            mockInteraction.options.getString.mockImplementation((key) => {
                if (key === 'key') return 'INVALID_KEY';
                if (key === 'value') return 'invalid_value';
                return null;
            });
            mockConfigManager.validate.mockReturnValue({
                valid: false,
                errors: ['Invalid configuration key']
            });

            await execute(mockInteraction);

            expect(mockConfigManager.validate).toHaveBeenCalled();
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('Invalid configuration'),
                    ephemeral: true
                })
            );
        });

        it('should proceed with valid configuration', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('set');
            mockInteraction.options.getString.mockImplementation((key) => {
                if (key === 'key') return 'DEBUG';
                if (key === 'value') return 'true';
                return null;
            });
            mockConfigManager.validate.mockReturnValue({
                valid: true,
                errors: []
            });

            await execute(mockInteraction);

            expect(mockConfigManager.validate).toHaveBeenCalled();
            expect(mockConfigManager.set).toHaveBeenCalledWith('DEBUG', 'true');
        });
    });

    describe('Response formatting', () => {
        it('should format configuration display properly', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('view');
            mockConfigManager.getAll.mockReturnValue({
                MESSAGE_PROVIDER: 'discord',
                LLM_PROVIDER: 'openai',
                DEBUG: 'false',
                SENSITIVE_KEY: 'secret-value'
            });

            await execute(mockInteraction);

            const replyCall = mockInteraction.reply.mock.calls[0][0];
            expect(replyCall.content).toContain('MESSAGE_PROVIDER');
            expect(replyCall.content).toContain('LLM_PROVIDER');
            expect(replyCall.content).toContain('DEBUG');
            // Should redact sensitive information
            expect(replyCall.content).not.toContain('secret-value');
        });

        it('should handle empty configuration gracefully', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('view');
            mockConfigManager.getAll.mockReturnValue({});

            await execute(mockInteraction);

            expect(mockInteraction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('No configuration'),
                    ephemeral: true
                })
            );
        });
    });
});
