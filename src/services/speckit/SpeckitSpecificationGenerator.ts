import { getLlmProvider } from '@llm/getLlmProvider';
import Logger from '@common/logger';

const log = Logger;

export class SpeckitSpecificationGenerator {
  /**
   * Generate a structured specification from a natural language topic
   */
  async generateSpecification(topic: string): Promise<string> {
    // Input validation
    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      throw new Error('Topic must be a non-empty string');
    }

    const trimmedTopic = topic.trim();
    log.info('Generating specification for topic:', trimmedTopic);

    try {
      const llmProviders = await getLlmProvider();

      if (!llmProviders || llmProviders.length === 0) {
        throw new Error('No LLM providers configured');
      }

      const primaryProvider = llmProviders[0];
      if (!primaryProvider || typeof primaryProvider.generateChatCompletion !== 'function') {
        throw new Error('Primary LLM provider is not properly configured');
      }

      const prompt = `Generate a comprehensive specification document for the following topic: "${trimmedTopic}"

Please create a well-structured specification in markdown format that includes:
- Overview/Purpose
- User Stories
- Functional Requirements
- Non-Functional Requirements
- Acceptance Criteria
- Success Metrics
- Technical Considerations

Make sure the specification is detailed, clear, and actionable.`;

      const response = await primaryProvider.generateChatCompletion(prompt, []);

      if (!response || typeof response !== 'string' || response.trim().length === 0) {
        throw new Error('Empty or invalid response from LLM provider');
      }

      log.info('Successfully generated specification for topic:', trimmedTopic);
      return response.trim();
    } catch (error) {
      log.error('Failed to generate specification:', error);
      throw new Error(
        `Failed to generate specification: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
