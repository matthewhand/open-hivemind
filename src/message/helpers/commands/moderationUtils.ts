import ConfigurationManager from '@config/ConfigurationManager';

const configManager = new ConfigurationManager();

/**
 * Moderation utilities for handling and processing commands.
 */
export class ModerationUtils {
    private readonly openAiBaseUrl: string = configManager.OPENAI_BASE_URL || 'https://api.default-llm.com';
    private readonly openAiModel: string = configManager.OPENAI_MODEL || 'default-model';
    private readonly llmApiKey: string = configManager.LLM_API_KEY || 'default-key';

    constructor() {}

    // Methods and logic for moderation utilities
}
