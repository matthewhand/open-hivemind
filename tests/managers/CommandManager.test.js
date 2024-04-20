const CommandManager = require('@/managers/CommandManager');
const IMessage = require('@/interfaces/IMessage');

class MockMessage {
    constructor(content) {
        this.content = content;
    }

    getText() {
        return this.content;
    }

    getMessageId() {
        return '12345';
    }

    getChannelId() {
        return 'channel1';
    }

    getAuthorId() {
        return 'user1';
    }
}

describe('CommandManager', () => {
    let commandManager;

    beforeEach(() => {
        commandManager = new CommandManager();
    });

    test('should correctly extract command name from message', () => {
        const mockMessage = new MockMessage('!help');
        commandManager.parseCommand(mockMessage.getText());
        expect(commandManager.currentCommand.commandName).toEqual('help');
    });
    
    // test('should correctly handle command with arguments', () => {
    //     const mockMessage = new MockMessage('!ban user123');
    //     commandManager.parseCommand(mockMessage.getText());
    //     expect(commandManager.currentCommand.commandName).toEqual('ban');
    //     expect(commandManager.currentCommand.args).toEqual(['user123']);
    // });
    
});
