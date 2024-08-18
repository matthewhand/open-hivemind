import logger from './logger';

export function extractContent(choice: any): string {
    if (!choice || typeof choice !== 'object') {
        logger.debug('[extractContent] Invalid choice object.');
        return '';
    }

    logger.debug('[extractContent] Initial choice object: ' + JSON.stringify(choice));

    if (typeof choice.text === 'string') {
        logger.debug('[extractContent] Content extracted directly from text field.');
        return choice.text.trim();
    }

    if (choice.message && typeof choice.message.content === 'string') {
        logger.debug('[extractContent] Content extracted from message.content field.');
        return choice.message.content.trim();
    }

    logger.debug('[extractContent] No valid content found in choice object; returning empty string.');
    return '';
}

export function needsCompletion(maxTokensReached: boolean, finishReason: string, content: string): boolean {
    return (maxTokensReached || finishReason === 'length') && !/[.?!]\s*$/.test(content);
}

export function getEmoji(): string {
    const emojis = [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
        '🙂', '🙃', '😉', '😌', '😍', '😘', '😗', '😙', '😚', '😋',
        '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳',
        '🤖', '👀'
    ];
    return emojis[Math.floor(Math.random() * emojis.length)];
}
