import { IMessage } from '@src/message/interfaces/IMessage';

export class MockMessage implements IMessage {
    getMessageId() {
        return '12345';
    }
    getText() {
        return 'Test message';
    }
    getAuthorName() {
        return 'TestUser';
    }
    isFromBot() {
        return false;
    }
    getChannelId() {
        return '67890';
    }
    getAuthorId() {
        return '54321';
    }
    getChannelTopic() {
        return 'General Discussion';
    }
    getUserMentions() {
        return ['TestUser1', 'TestUser2'];
    }
    getChannelUsers() {
        return ['User1', 'User2', 'User3'];
    }
    mentionsUsers() {
        return true;
    }

    content = 'Test message';
    client = {};
    channelId = '67890';
    data = {};
    userMentions = ['TestUser1', 'TestUser2'];
    messageReference = null;

    role = 'user';
    isReplyToBot = () => false;
    reply = async (content: string): Promise<void> => {
        console.log('Replying with:', content);
    };
}
