import convict from "convict";

/**
 * Flowise-specific configuration using convict.
 * This handles the API keys, endpoint URLs, and chatflow IDs specific to Flowise integration.
 */
const flowiseConfig = convict({
    FLOWISE_API_KEY: {
        doc: "API Key for Flowise integration",
        format: String,
        default: "",
        env: "FLOWISE_API_KEY"
    },
    FLOWISE_API_ENDPOINT: {
        doc: "Flowise API base URL",
        format: String,
        default: "http://localhost:3002/api/v1",
        env: "FLOWISE_API_ENDPOINT"
    },
    FLOWISE_CONVERSATION_CHATFLOW_ID: {
        doc: "Flowise chatflow ID for multi-turn conversations",
        format: String,
        default: "",
        env: "FLOWISE_CONVERSATION_CHATFLOW_ID"
    },
    FLOWISE_COMPLETION_CHATFLOW_ID: {
        doc: "Flowise chatflow ID for single-turn completions",
        format: String,
        default: "",
        env: "FLOWISE_COMPLETION_CHATFLOW_ID"
    },
    FLOWISE_FOLLOWUP_CHATFLOW_ID: {
        doc: "Flowise follow-up chatflow ID",
        format: String,
        default: "",
        env: "FLOWISE_FOLLOWUP_CHATFLOW_ID"
    },
    FLOWISE_IDLE_CHATFLOW_ID: {
        doc: "Flowise idle chatflow ID",
        format: String,
        default: "",
        env: "FLOWISE_IDLE_CHATFLOW_ID"
    },
    FLOWISE_SCHEDULED_CHATFLOW_ID: {
        doc: "Flowise scheduled chatflow ID",
        format: String,
        default: "",
        env: "FLOWISE_SCHEDULED_CHATFLOW_ID"
    },
    FLOWISE_GENERAL_CHATFLOW_ID: {
        doc: "Flowise general chatflow ID",
        format: String,
        default: "",
        env: "FLOWISE_GENERAL_CHATFLOW_ID"
    }
});

// Enforce strict validation
flowiseConfig.validate({ allowed: "strict" });

export default flowiseConfig;

