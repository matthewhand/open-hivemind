import config from 'config';

class MessageConfig {
    public readonly MESSAGE_PROVIDER: string;
    public readonly MESSAGE_MIN_INTERVAL_MS: number;
    public readonly MESSAGE_FOLLOW_UP_ENABLED: boolean;
    public readonly MESSAGE_LLM_CHAT: boolean;
    public readonly MESSAGE_LLM_COMPLETE_SENTENCE: boolean;
    public readonly MESSAGE_LLM_FOLLOW_UP: boolean;
    public readonly MESSAGE_LLM_SUMMARISE: boolean;
    public readonly MESSAGE_COMMAND_INLINE: boolean;
    public readonly MESSAGE_COMMAND_SLASH: boolean;
    public readonly MESSAGE_COMMAND_AUTHORISED_USERS: string;

    constructor() {
        this.MESSAGE_PROVIDER = process.env.MESSAGE_PROVIDER || config.get<string>('message.MESSAGE_PROVIDER') || 'discord';
        this.MESSAGE_MIN_INTERVAL_MS = Number(process.env.MESSAGE_MIN_INTERVAL_MS) || config.get<number>('message.MESSAGE_MIN_INTERVAL_MS') || 1000;
        this.MESSAGE_FOLLOW_UP_ENABLED = process.env.MESSAGE_FOLLOW_UP_ENABLED === 'true' || config.get<boolean>('message.MESSAGE_FOLLOW_UP_ENABLED') || false;
        this.MESSAGE_LLM_CHAT = process.env.MESSAGE_LLM_CHAT === 'true' || config.get<boolean>('message.MESSAGE_LLM_CHAT') || true;
        this.MESSAGE_LLM_COMPLETE_SENTENCE = process.env.MESSAGE_LLM_COMPLETE_SENTENCE === 'true' || config.get<boolean>('message.MESSAGE_LLM_COMPLETE_SENTENCE') || true;
        this.MESSAGE_LLM_FOLLOW_UP = process.env.MESSAGE_LLM_FOLLOW_UP === 'true' || config.get<boolean>('message.MESSAGE_LLM_FOLLOW_UP') || true;
        this.MESSAGE_LLM_SUMMARISE = process.env.MESSAGE_LLM_SUMMARISE === 'true' || config.get<boolean>('message.MESSAGE_LLM_SUMMARISE') || true;
        this.MESSAGE_COMMAND_INLINE = process.env.MESSAGE_COMMAND_INLINE === 'true' || config.get<boolean>('message.MESSAGE_COMMAND_INLINE') || true;
        this.MESSAGE_COMMAND_SLASH = process.env.MESSAGE_COMMAND_SLASH === 'true' || config.get<boolean>('message.MESSAGE_COMMAND_SLASH') || true;
        this.MESSAGE_COMMAND_AUTHORISED_USERS = process.env.MESSAGE_COMMAND_AUTHORISED_USERS || config.get<string>('message.MESSAGE_COMMAND_AUTHORISED_USERS') || '';
    }
}

export default MessageConfig;
