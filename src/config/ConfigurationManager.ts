import { config } from 'dotenv';
config();

/**
 * ConfigurationManager handles the retrieval of environment variables
 * and application-specific configurations.
 *
 * It provides a centralized interface for accessing configuration
 * values, ensuring that defaults are applied when necessary.
 */
class ConfigurationManager {
  public static LLM_MODEL = process.env.LLM_MODEL || 'gpt-3.5-turbo';
  public static LLM_SYSTEM_PROMPT = process.env.LLM_SYSTEM_PROMPT || 'You are a helpful assistant.';
  public static LLM_RESPONSE_MAX_TOKENS = parseInt(process.env.LLM_RESPONSE_MAX_TOKENS || '1500', 10);
  public static LLM_TEMPERATURE = parseFloat(process.env.LLM_TEMPERATURE || '0.7');
  public static LLM_STOP = process.env.LLM_STOP ? process.env.LLM_STOP.split(',') : [];

  /**
   * Retrieves a configuration value by key.
   *
   * @param key - The configuration key to retrieve.
   * @param defaultValue - A default value to use if the key is not set.
   * @returns The configuration value.
   */
  public static getConfig(key: string, defaultValue?: any): any {
    return process.env[key] || defaultValue;
  }
}

export default ConfigurationManager;
