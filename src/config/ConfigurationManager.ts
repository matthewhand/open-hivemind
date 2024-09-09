/**
 * ConfigurationManager Class
 *
 * This singleton class is responsible for managing global application configurations, including storing
 * session-related information for various integrations. It is designed to be integration-agnostic, allowing
 * for scalability across different systems (e.g., Flowise, OpenAI, etc.).
 */
export class ConfigurationManager {
    private static instance: ConfigurationManager;
    private config: Record<string, any> = {};  // Generic config store for sessions per integration and channel

    private constructor() {}

    /**
     * Retrieves the singleton instance of ConfigurationManager.
     * If the instance does not exist, it is created.
     *
     * @returns The singleton instance of ConfigurationManager.
     */
    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }

    /**
     * Stores a session ID for a specific integration and channel.
     * This method is designed to be integration-agnostic, meaning it can store session information for
     * various systems (e.g., Flowise, OpenAI, etc.).
     *
     * @param integration - The name of the integration (e.g., 'flowise')
     * @param channelId - The ID of the channel or conversation
     * @param sessionId - The session ID to store
     */
    public setSession(integration: string, channelId: string, sessionId: string) {
        if (!this.config[integration]) {
            this.config[integration] = {};
        }
        this.config[integration][channelId] = sessionId;
    }

    /**
     * Retrieves a stored session ID for a specific integration and channel.
     *
     * @param integration - The name of the integration (e.g., 'flowise')
     * @param channelId - The ID of the channel or conversation
     * @returns The session ID if found, or undefined if not stored
     */
    public getSession(integration: string, channelId: string): string | undefined {
        return this.config[integration]?.[channelId];
    }

    /**
     * Retrieves all session IDs for a specific integration.
     *
     * @param integration - The name of the integration (e.g., 'flowise')
     * @returns A record of all channel IDs mapped to their session IDs
     */
    public getAllSessions(integration: string): Record<string, string> | undefined {
        return this.config[integration];
    }
}
