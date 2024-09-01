import ConfigurationManager from '@config/ConfigurationManager';
import { OpenAI } from 'openai';
import { IMessage } from '@src/message/interfaces/IMessage';

const configManager = ConfigurationManager.getInstance();
const llmConfig = configManager.getConfig('llm');

if (!llmConfig) {
    throw new Error('LLM configuration not found. Please ensure the LLM config is loaded.');
}

export function createChatCompletion(
    historyMessages: IMessage[],
    systemMessageContent: string = llmConfig?.get('LLM_SYSTEM_PROMPT') || '',
    maxTokens: number = llmConfig?.get('LLM_RESPONSE_MAX_TOKENS') || 150
): OpenAI.Chat.CreateChatCompletionRequest {
    return {
        model: llmConfig?.get('LLM_MODEL') || 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemMessageContent },
            ...historyMessages.map(msg => ({ role: msg.role, content: msg.content })),
        ],
        max_tokens: maxTokens,
        temperature: llmConfig?.get('LLM_TEMPERATURE') || 0.7,
        frequency_penalty: llmConfig?.get('LLM_FREQUENCY_PENALTY'),
        presence_penalty: llmConfig?.get('LLM_PRESENCE_PENALTY'),
        stop: llmConfig?.get('LLM_STOP'),
        top_p: llmConfig?.get('LLM_TOP_P'),
    };
}
