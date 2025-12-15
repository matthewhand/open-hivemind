
import { detectMentions } from '../../../../src/message/helpers/processing/MentionDetector';

describe('MentionDetector', () => {
    const botId = 'bot-123';
    const botName = 'MyBot';

    it('should detect direct mentions via isMentioning method', () => {
        const msg = {
            getText: () => 'Hello there',
            isMentioning: (id: string) => id === botId
        };
        const result = detectMentions(msg, botId, botName);
        expect(result.isMentioningBot).toBe(true);
        expect(result.contextHint).toContain('You are being directly addressed');
    });

    it('should detect mentions via username in text', () => {
        const msg = {
            getText: () => 'Hello @MyBot how are you',
            content: 'Hello @MyBot how are you' // Fallback
        };
        const result = detectMentions(msg, botId, botName);
        expect(result.isMentioningBot).toBe(true);
    });

    it('should treat plain bot name in text as being addressed', () => {
        const msg = {
            getText: () => 'MyBot: can you help me with this?'
        };
        const result = detectMentions(msg, botId, botName);
        expect(result.isMentioningBot).toBe(true);
        expect(result.isBotNameInText).toBe(true);
        expect(result.contextHint).toContain('directly addressed');
    });

    it('should treat bot name with comma as being addressed', () => {
        const msg = {
            getText: () => 'Hey MyBot, what do you think?'
        };
        const result = detectMentions(msg, botId, botName);
        expect(result.isMentioningBot).toBe(true);
        expect(result.isBotNameInText).toBe(true);
    });

    it('should detect replies to bot', () => {
        const msg = {
            getText: () => 'Yes I agree',
            isReply: () => true,
            metadata: {
                replyTo: {
                    userId: botId,
                    username: 'MyBot'
                }
            }
        };
        const result = detectMentions(msg, botId, botName);
        expect(result.isReplyToBot).toBe(true);
        expect(result.contextHint).toContain('You are being directly addressed');
    });

    it('should detect mentions of other users', () => {
        const msg = {
            getText: () => 'Hey @UserA and @UserB',
        };
        const result = detectMentions(msg, botId, botName);
        expect(result.mentionedUsernames).toContain('UserA');
        expect(result.mentionedUsernames).toContain('UserB');
        expect(result.contextHint).toContain('addressing UserA, UserB');
    });

    it('should provide a default context hint when no mentions/reply target is detected', () => {
        const msg = {
            getText: () => 'Hello there'
        };
        const result = detectMentions(msg, botId, botName);
        expect(result.isMentioningBot).toBe(false);
        expect(result.isReplyToBot).toBe(false);
        expect(result.mentionedUsernames).toHaveLength(0);
        expect(result.contextHint).toContain('unclear');
        expect(result.contextHint).toContain('topic');
        expect(result.contextHint).toContain('room');
        expect(result.contextHint).toContain('Infer');
    });

    it('should detect reply to other user', () => {
        const msg = {
            getText: () => 'I disagree',
            isReply: () => true,
            metadata: {
                replyTo: {
                    userId: 'other-user',
                    username: 'OtherUser'
                }
            }
        };
        const result = detectMentions(msg, botId, botName);
        expect(result.isReplyToBot).toBe(false);
        expect(result.isReplyToOther).toBe(true);
        expect(result.replyToUsername).toBe('OtherUser');
        expect(result.contextHint).toContain('replying to a message from OtherUser');
    });

    it('should prioritise bot detection over others', () => {
        // Reply to bot AND mention other
        const msg = {
            getText: () => 'Yes @OtherUser',
            isReply: () => true,
            metadata: {
                replyTo: { userId: botId, username: botName }
            },
            isMentioning: (id: string) => id === botId
        };
        const result = detectMentions(msg, botId, botName);
        expect(result.isMentioningBot).toBe(true);
        expect(result.isReplyToBot).toBe(true);
        expect(result.contextHint).toContain('You are being directly addressed');
        expect(result.contextHint).not.toContain('observing');
    });
});
