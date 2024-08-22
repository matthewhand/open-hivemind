import config from 'config';
import logger from '../../utils/logger';

import { getConfigOrWarn } from '@utils/configUtils';

class ConfigurationManager {
    public readonly LLM_API_KEY: string = process.env.LLM_API_KEY || 'default_api_key';
    public readonly LLM_ENDPOINT_URL: string = process.env.LLM_ENDPOINT_URL || 'default_endpoint_url';
    public readonly LLM_SYSTEM_PROMPT: string = getConfigOrWarn<string>('llm.systemPrompt', 'default_system_prompt');
    public readonly LLM_RESPONSE_MAX_TOKENS: number = getConfigOrWarn<number>('llm.responseMaxTokens', 100);
    public readonly LLM_TEMPERATURE: number = getConfigOrWarn<number>('llm.temperature', 0.7);
    public readonly LLM_MODEL: string = getConfigOrWarn<string>('llm.model', 'default_model');
    public readonly LLM_MESSAGE_LIMIT_PER_HOUR: number = getConfigOrWarn<number>('llm.messageLimitPerHour', 1000);
    public readonly CLIENT_ID: string = getConfigOrWarn<string>('discord.clientId', 'default_client_id');
}

export default new ConfigurationManager();
