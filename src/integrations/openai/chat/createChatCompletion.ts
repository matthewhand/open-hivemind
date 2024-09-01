export function createChatCompletion(
    historyMessages: IMessage[],
    systemMessageContent: string = llmConfig?.get('LLM_SYSTEM_PROMPT') || '',
    maxTokens: number = llmConfig?.get('LLM_RESPONSE_MAX_TOKENS') || 150
): OpenAI.Chat.CreateChatCompletionRequestMessage {
    // @ts-ignore: Suppressing potential deep type instantiation issues
    return {
        messages: [
            { role: 'system', content: systemMessageContent },
            ...historyMessages.map(msg => ({ role: msg.role, content: msg.content })),
        ],
        max_tokens: maxTokens,
        temperature: llmConfig?.get('LLM_TEMPERATURE') || 0.7,
        frequency_penalty: llmConfig?.get('LLM_FREQUENCY_PENALTY') || 0,
        presence_penalty: llmConfig?.get('LLM_PRESENCE_PENALTY') || 0,
        stop: llmConfig?.get('LLM_STOP') || undefined,
        top_p: llmConfig?.get('LLM_TOP_P') || 1,
    } as unknown as OpenAI.Chat.CreateChatCompletionRequestMessage; // Casting to ensure type compatibility
}

