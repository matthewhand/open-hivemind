export interface LlmProvider {
  /**
   * Generates a chat completion based on the given prompt and optional history.
   * @param prompt - The main input for the model.
   * @param history - Optional array of previous messages for multi-turn context.
   * @returns A promise resolving to the generated response.
   */
  generateChatCompletion(prompt: string, history?: string[]): Promise<any>;
}
