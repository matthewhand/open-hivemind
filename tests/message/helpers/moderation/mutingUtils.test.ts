
import { muteUser } from '../../../../src/message/helpers/moderation/mutingUtils';
import { TextChannel, EmbedBuilder } from 'discord.js';

// Mock discord.js
const mockSend = jest.fn();
const mockRolesAdd = jest.fn();
const mockFetchMember = jest.fn();

const mockGuild = {
    members: {
        fetch: mockFetchMember
    },
    roles: {
        cache: [
            { name: 'Muted', id: 'role-muted-id' },
            { name: 'Member', id: 'role-member-id' }
        ]
    }
};

const mockChannel = {
    id: 'channel-1',
    guild: mockGuild,
    send: mockSend
} as unknown as TextChannel;

jest.mock('discord.js', () => ({
    EmbedBuilder: jest.fn().mockImplementation(() => ({
        setTitle: jest.fn().mockReturnThis(),
        setDescription: jest.fn().mockReturnThis(),
        addFields: jest.fn().mockReturnThis(),
        setColor: jest.fn().mockReturnThis(),
    }))
}));

describe('mutingUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default mocks
        mockFetchMember.mockResolvedValue({
            roles: {
                add: mockRolesAdd
            }
        });
        // Reset role cache find implementation if needed
        // Assuming Array.prototype.find works on the mock array
    });

    it('should mute user if role exists', async () => {
        await muteUser(mockChannel, 'user-1');

        expect(mockFetchMember).toHaveBeenCalledWith('user-1');
        expect(mockRolesAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Muted' }));
        expect(mockSend).toHaveBeenCalled();
    });

    it('should not mute if role does not exist', async () => {
        const noMutedRoleGuild = {
            ...mockGuild,
            roles: { cache: [] }
        };
        const noRoleChannel = { ...mockChannel, guild: noMutedRoleGuild } as unknown as TextChannel;

        await muteUser(noRoleChannel, 'user-1');

        expect(mockRolesAdd).not.toHaveBeenCalled();
        expect(mockSend).not.toHaveBeenCalled();
    });
});
