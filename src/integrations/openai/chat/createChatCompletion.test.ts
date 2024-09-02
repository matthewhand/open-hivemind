import { createChatCompletion } from './createChatCompletion';
import { MockMessage } from './MockMessage';
import Debug from 'debug';

const debug = Debug('test:createChatCompletion');

describe('createChatCompletion', () => {
    it('should create a valid chat completion request', async () => {
        // Prepare mock messages
        const historyMessages: MockMessage[] = [
            new MockMessage('user', 'What is the weather today?'),
            new MockMessage('assistant', 'The weather today is sunny with a high of 75 degrees.'),
        ];

        // Execute the function
        const result = await createChatCompletion(historyMessages);

        // Log and validate the result
        debug('createChatCompletion result:', result);
        expect(result).toBeTruthy();
        expect(result.model).toBeDefined();
        expect(result.choices).toBeInstanceOf(Array);
        expect(result.choices.length).toBeGreaterThan(0);
        expect(result.choices[0].message.content).toContain('The weather today');
    });
});
