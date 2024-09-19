import convict from 'convict';

const messageConfig = convict({
    MESSAGE_PROVIDER: {
        doc: 'Message provider (e.g., discord)',
        format: String,
        default: 'discord',
        env: 'MESSAGE_PROVIDER'
    },
    MESSAGE_MIN_INTERVAL_MS: {
        doc: 'Minimum interval between messages (ms)',
        format: 'int',
        default: 1000,
        env: 'MESSAGE_MIN_INTERVAL_MS'
    },
    MESSAGE_FOLLOW_UP_ENABLED: {
        doc: 'Enable follow-up messages',
        format: Boolean,
        default: false,
        env: 'MESSAGE_FOLLOW_UP_ENABLED'
    },
    MESSAGE_IGNORE_BOTS: {
        doc: 'Enable ignore bots',
        format: Boolean,
        default: true,
        env: 'MESSAGE_IGNORE_BOTS'
    },
    MESSAGE_LLM_CHAT: {
        doc: 'Enable chat completion using LLM',
        format: Boolean,
        default: true,
        env: 'MESSAGE_LLM_CHAT'
    },
    MESSAGE_LLM_COMPLETE_SENTENCE: {
        doc: 'Enable LLM sentence completion',
        format: Boolean,
        default: true,
        env: 'MESSAGE_LLM_COMPLETE_SENTENCE'
    },
    MESSAGE_LLM_FOLLOW_UP: {
        doc: 'Enable follow-up requests for LLM responses',
        format: Boolean,
        default: false,
        env: 'MESSAGE_LLM_FOLLOW_UP'
    },
    MESSAGE_LLM_SUMMARISE: {
        doc: 'Enable LLM summarization',
        format: Boolean,
        default: true,
        env: 'MESSAGE_LLM_SUMMARISE'
    },
    MESSAGE_COMMAND_INLINE: {
        doc: 'Enable inline commands',
        format: Boolean,
        default: true,
        env: 'MESSAGE_COMMAND_INLINE'
    },
    MESSAGE_COMMAND_SLASH: {
        doc: 'Enable slash commands',
        format: Boolean,
        default: true,
        env: 'MESSAGE_COMMAND_SLASH'
    },
    MESSAGE_COMMAND_AUTHORISED_USERS: {
        doc: 'Authorized users for commands',
        format: String,
        default: '',
        env: 'MESSAGE_COMMAND_AUTHORISED_USERS'
    },
    MESSAGE_WEBHOOK_ENABLED: {
        doc: 'Enable webhook functionality',
        format: Boolean,
        default: false,
        env: 'MESSAGE_WEBHOOK_ENABLED'
    }
});

messageConfig.validate({ allowed: 'strict' });

export default messageConfig;
