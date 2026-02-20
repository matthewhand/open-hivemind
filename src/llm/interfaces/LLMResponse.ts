/**
 * Class representing an LLM (Large Language Model) response.
 */
class LLMResponse {
  private id: string;
  private object: string;
  private created: number;
  private model: string;
  private choices: {
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }[];
  private usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  private content: string;
  private finish_reason: string;
  private completion_tokens: number;

  constructor(
    id: string,
    object: string,
    created: number,
    model: string,
    choices: { index: number; message: { role: string; content: string }; finish_reason: string }[],
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
    content: string,
    finish_reason: string = 'completed',
    completion_tokens: number = 0
  ) {
    this.id = id;
    this.object = object;
    this.created = created;
    this.model = model;
    this.choices = choices;
    this.usage = usage;
    this.content = content;
    this.finish_reason = finish_reason;
    this.completion_tokens = completion_tokens;
  }

  /**
   * Retrieves the ID of the response.
   * @returns {string} The response ID.
   */
  getId(): string {
    return this.id;
  }

  /**
   * Retrieves the object type of the response.
   * @returns {string} The object type.
   */
  getObject(): string {
    return this.object;
  }

  /**
   * Retrieves the creation timestamp of the response.
   * @returns {number} The creation timestamp.
   */
  getCreated(): number {
    return this.created;
  }

  /**
   * Retrieves the model used for the response.
   * @returns {string} The model name.
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Retrieves the choices in the response.
   * @returns {Array} The choices array.
   */
  getChoices(): {
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }[] {
    // Return a deep copy to prevent external modification
    return JSON.parse(JSON.stringify(this.choices));
  }

  /**
   * Retrieves the usage statistics of the response.
   * @returns {Object} The usage statistics.
   */
  getUsage(): { prompt_tokens: number; completion_tokens: number; total_tokens: number } {
    // Return a copy to prevent external modification
    return { ...this.usage };
  }

  /**
   * Retrieves the content of the response.
   * @returns {string} The response content.
   */
  getContent(): string {
    return this.content;
  }

  /**
   * Retrieves the reason for finishing the response.
   * @returns {string} The finish reason.
   */
  getFinishReason(): string {
    return this.finish_reason;
  }

  /**
   * Retrieves the number of completion tokens used in the response.
   * @returns {number} The number of completion tokens.
   */
  getCompletionTokens(): number {
    return this.completion_tokens;
  }
}

export { LLMResponse };
export default LLMResponse;
