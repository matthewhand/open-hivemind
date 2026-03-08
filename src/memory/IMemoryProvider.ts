export interface MemoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface IMemoryProvider {
  /**
   * Retrieves relevant memories based on the user's prompt.
   * Return an array of string facts/memories to inject into the LLM context.
   */
  searchMemory(userId: string, query: string, metadata?: Record<string, any>): Promise<string[]>;

  /**
   * Stores a new conversation interaction.
   * Pass the latest messages so the memory provider can extract and store new facts.
   */
  storeMemory(
    userId: string,
    messages: MemoryMessage[],
    metadata?: Record<string, any>
  ): Promise<void>;
}
