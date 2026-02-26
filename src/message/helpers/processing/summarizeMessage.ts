import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { getLlmProvider } from '@llm/getLlmProvider';
import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { DatabaseManager, ConversationSummary } from '../../../database/DatabaseManager';

const debug = Debug('app:summarizeMessage');

export interface SummarizationOptions {
  maxLength?: number;
  style?: 'brief' | 'detailed' | 'bullet' | 'technical' | 'casual';
  includeKeywords?: boolean;
  includeSentiment?: boolean;
  language?: string;
  preserveContext?: boolean;
}

export interface SummarizationResult {
  summary: string;
  originalLength: number;
  summaryLength: number;
  compressionRatio: number;
  keywords?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  keyTopics?: string[];
  confidence: number;
  processingTime: number;
}

export interface ConversationSummarizationOptions extends SummarizationOptions {
  timeWindow?: number; // minutes
  participantCount?: number;
  includeMetrics?: boolean;
  groupByTopic?: boolean;
}

export interface ConversationSummarizationResult extends SummarizationResult {
  participantCount: number;
  messageCount: number;
  timeSpan: {
    start: Date;
    end: Date;
    duration: number; // minutes
  };
  topParticipants?: { name: string; messageCount: number }[];
  topics?: { topic: string; messages: number; relevance: number }[];
  activityPattern?: { hour: number; messageCount: number }[];
}

class SummarizationEngine {
  private llmProviders: ILlmProvider[];
  private dbManager: DatabaseManager;

  constructor() {
    this.llmProviders = getLlmProvider();
    this.dbManager = DatabaseManager.getInstance();
  }

  async summarizeText(text: string, options: SummarizationOptions = {}): Promise<SummarizationResult> {
    const startTime = Date.now();
    
    try {
      debug(`Starting text summarization for ${text.length} characters`);

      // Validate input
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      // Apply default options
      const opts: Required<SummarizationOptions> = {
        maxLength: options.maxLength || 150,
        style: options.style || 'brief',
        includeKeywords: options.includeKeywords || false,
        includeSentiment: options.includeSentiment || false,
        language: options.language || 'en',
        preserveContext: options.preserveContext || true
      };

      // Create summarization prompt based on style
      const prompt = this.createSummarizationPrompt(text, opts);

      // Get summary from LLM
      let summary = '';
      let confidence = 0;

      if (this.llmProviders.length > 0) {
        try {
          const llmResponse = await this.llmProviders[0].generateChatCompletion(prompt, []);

          summary = this.extractSummaryFromResponse(typeof llmResponse === 'string' ? llmResponse : (llmResponse as any).text || (llmResponse as any).content || String(llmResponse));
          confidence = this.calculateConfidence(text, summary);
        } catch (llmError) {
          debug('LLM summarization failed, falling back to extractive method:', llmError);
          summary = this.extractiveSummarization(text, opts.maxLength);
          confidence = 0.6; // Lower confidence for fallback method
        }
      } else {
        debug('No LLM providers available, using extractive summarization');
        summary = this.extractiveSummarization(text, opts.maxLength);
        confidence = 0.6;
      }

      // Generate additional features if requested
      const keywords = opts.includeKeywords ? this.extractKeywords(text) : undefined;
      const sentiment = opts.includeSentiment ? this.analyzeSentiment(text) : undefined;
      const keyTopics = this.extractKeyTopics(text);

      const processingTime = Date.now() - startTime;

      const result: SummarizationResult = {
        summary: summary.trim(),
        originalLength: text.length,
        summaryLength: summary.length,
        compressionRatio: text.length > 0 ? summary.length / text.length : 0,
        keywords,
        sentiment,
        keyTopics,
        confidence,
        processingTime
      };

      debug(`Summarization completed in ${processingTime}ms with ${result.compressionRatio.toFixed(2)} compression ratio`);
      return result;

    } catch (error) {
      debug('Error during text summarization:', error);
      throw new Error(`Summarization failed: ${error}`);
    }
  }

  async summarizeConversation(
    messages: Array<{ content: string; author: string; timestamp: Date; channelId: string }>,
    options: ConversationSummarizationOptions = {}
  ): Promise<ConversationSummarizationResult> {
    const startTime = Date.now();

    try {
      debug(`Starting conversation summarization for ${messages.length} messages`);

      if (!messages || messages.length === 0) {
        throw new Error('No messages to summarize');
      }

      // Sort messages by timestamp
      messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Apply time window filter if specified
      let filteredMessages = messages;
      if (options.timeWindow) {
        const cutoffTime = new Date(Date.now() - options.timeWindow * 60 * 1000);
        filteredMessages = messages.filter(msg => msg.timestamp >= cutoffTime);
      }

      // Calculate conversation metrics
      const timeSpan = {
        start: filteredMessages[0].timestamp,
        end: filteredMessages[filteredMessages.length - 1].timestamp,
        duration: (filteredMessages[filteredMessages.length - 1].timestamp.getTime() - 
                  filteredMessages[0].timestamp.getTime()) / (1000 * 60)
      };

      // Analyze participants
      const participantStats = this.analyzeParticipants(filteredMessages);
      const topParticipants = Object.entries(participantStats)
        .map(([name, count]) => ({ name, messageCount: count }))
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 5);

      // Combine all message content
      const conversationText = filteredMessages
        .map(msg => `${msg.author}: ${msg.content}`)
        .join('\n');

      // Get base summarization
      const baseSummary = await this.summarizeText(conversationText, {
        maxLength: options.maxLength || 300,
        style: options.style || 'detailed',
        includeKeywords: options.includeKeywords,
        includeSentiment: options.includeSentiment,
        language: options.language,
        preserveContext: options.preserveContext
      });

      // Generate conversation-specific analysis
      const topics = options.groupByTopic ? this.extractTopicsFromConversation(filteredMessages) : undefined;
      const activityPattern = options.includeMetrics ? this.analyzeActivityPattern(filteredMessages) : undefined;

      const processingTime = Date.now() - startTime;

      const result: ConversationSummarizationResult = {
        ...baseSummary,
        participantCount: Object.keys(participantStats).length,
        messageCount: filteredMessages.length,
        timeSpan,
        topParticipants,
        topics,
        activityPattern,
        processingTime
      };

      // Store summary in database if connected
      if (this.dbManager.isConnected() && filteredMessages.length > 0) {
        try {
          const summaryRecord: ConversationSummary = {
            channelId: filteredMessages[0].channelId,
            summary: result.summary,
            messageCount: result.messageCount,
            startTimestamp: timeSpan.start,
            endTimestamp: timeSpan.end,
            provider: 'hivemind'
          };
          await this.dbManager.storeConversationSummary(summaryRecord);
          debug('Conversation summary stored to database');
        } catch (dbError) {
          debug('Failed to store conversation summary:', dbError);
        }
      }

      debug(`Conversation summarization completed in ${processingTime}ms`);
      return result;

    } catch (error) {
      debug('Error during conversation summarization:', error);
      throw new Error(`Conversation summarization failed: ${error}`);
    }
  }

  private createSummarizationPrompt(text: string, options: Required<SummarizationOptions>): string {
    const styleInstructions = {
      brief: 'Provide a very concise summary in 1-2 sentences.',
      detailed: 'Provide a comprehensive summary that captures all main points.',
      bullet: 'Provide a bullet-point summary with key points listed.',
      technical: 'Provide a technical summary focusing on factual information and data.',
      casual: 'Provide a casual, conversational summary.'
    };

    let prompt = `Please summarize the following text in ${options.language}:\n\n${text}\n\n`;
    prompt += `Style: ${styleInstructions[options.style]}\n`;
    prompt += `Maximum length: approximately ${options.maxLength} characters.\n`;
    
    if (options.preserveContext) {
      prompt += `Preserve important context and relationships between ideas.\n`;
    }
    
    if (options.includeKeywords) {
      prompt += `Also extract 3-5 key keywords from the text.\n`;
    }
    
    if (options.includeSentiment) {
      prompt += `Analyze the overall sentiment (positive, negative, or neutral).\n`;
    }

    prompt += `\nProvide only the summary text in your response.`;

    return prompt;
  }

  private extractSummaryFromResponse(response: string): string {
    // Clean up the response and extract just the summary
    return response
      .replace(/^(Summary:|SUMMARY:)/i, '')
      .replace(/^(Here's a summary:|Here is a summary:)/i, '')
      .replace(/^(The summary is:|Summary:)/i, '')
      .trim();
  }

  private extractiveSummarization(text: string, maxLength: number): string {
    // Simple extractive summarization as fallback
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= 2) {
      return text.substring(0, maxLength);
    }

    // Score sentences based on word frequency and position
    const wordFreq = this.calculateWordFrequency(text);
    const sentenceScores = sentences.map((sentence, index) => {
      const words = sentence.toLowerCase().split(/\s+/);
      const score = words.reduce((sum, word) => sum + (wordFreq[word] || 0), 0) / words.length;
      const positionBonus = index === 0 ? 1.5 : (index === sentences.length - 1 ? 1.2 : 1.0);
      return { sentence: sentence.trim(), score: score * positionBonus, index };
    });

    // Select top sentences up to maxLength
    sentenceScores.sort((a, b) => b.score - a.score);
    
    let summary = '';
    for (const item of sentenceScores) {
      if (summary.length + item.sentence.length + 2 <= maxLength) {
        summary += (summary ? '. ' : '') + item.sentence;
      }
    }

    return summary || sentences[0].substring(0, maxLength);
  }

  private calculateWordFrequency(text: string): Record<string, number> {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word));

    const freq: Record<string, number> = {};
    words.forEach(word => {
      freq[word] = (freq[word] || 0) + 1;
    });

    return freq;
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'as', 'are', 'was', 'will', 'be',
      'have', 'has', 'had', 'by', 'for', 'of', 'with', 'this', 'that', 'from', 'they', 'we',
      'been', 'their', 'said', 'each', 'which', 'she', 'do', 'how', 'if', 'it', 'he', 'but',
      'what', 'some', 'we', 'can', 'out', 'other', 'were', 'all', 'there', 'when', 'up', 'use'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  private extractKeywords(text: string): string[] {
    const wordFreq = this.calculateWordFrequency(text);
    return Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    // Simple keyword-based sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'pleased'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'frustrated', 'disappointed', 'sad'];
    
    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private extractKeyTopics(text: string): string[] {
    // Extract potential topics using noun phrases and important keywords
    const words = this.calculateWordFrequency(text);
    return Object.keys(words)
      .filter(word => word.length > 4)
      .slice(0, 3);
  }

  private calculateConfidence(originalText: string, summary: string): number {
    // Simple confidence calculation based on length ratio and keyword preservation
    const lengthRatio = summary.length / originalText.length;
    const keywordPreservation = this.calculateKeywordPreservation(originalText, summary);
    
    let confidence = 0.5; // Base confidence
    
    // Adjust based on compression ratio
    if (lengthRatio > 0.1 && lengthRatio < 0.5) {
      confidence += 0.3; // Good compression ratio
    }
    
    // Adjust based on keyword preservation
    confidence += keywordPreservation * 0.2;
    
    return Math.min(Math.max(confidence, 0), 1);
  }

  private calculateKeywordPreservation(originalText: string, summary: string): number {
    const originalKeywords = this.extractKeywords(originalText);
    const summaryText = summary.toLowerCase();
    
    const preservedCount = originalKeywords.filter(keyword => 
      summaryText.includes(keyword.toLowerCase())
    ).length;
    
    return originalKeywords.length > 0 ? preservedCount / originalKeywords.length : 1;
  }

  private analyzeParticipants(messages: Array<{ author: string; content: string }>): Record<string, number> {
    const stats: Record<string, number> = {};
    messages.forEach(msg => {
      stats[msg.author] = (stats[msg.author] || 0) + 1;
    });
    return stats;
  }

  private extractTopicsFromConversation(messages: Array<{ content: string; author: string }>): 
    Array<{ topic: string; messages: number; relevance: number }> {
    // Group messages by similar keywords/topics
    const topicMap: Record<string, string[]> = {};
    
    messages.forEach(msg => {
      const keywords = this.extractKeywords(msg.content);
      keywords.forEach(keyword => {
        if (!topicMap[keyword]) topicMap[keyword] = [];
        topicMap[keyword].push(msg.content);
      });
    });

    return Object.entries(topicMap)
      .map(([topic, relatedMessages]) => ({
        topic,
        messages: relatedMessages.length,
        relevance: relatedMessages.length / messages.length
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
  }

  private analyzeActivityPattern(messages: Array<{ timestamp: Date }>): 
    Array<{ hour: number; messageCount: number }> {
    const hourCounts: Record<number, number> = {};
    
    messages.forEach(msg => {
      const hour = msg.timestamp.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), messageCount: count }))
      .sort((a, b) => a.hour - b.hour);
  }
}

// Singleton instance
const summarizationEngine = new SummarizationEngine();

/**
 * Main message summarization function - maintains backwards compatibility
 * @param message - The message to summarize.
 * @returns A promise that resolves with the summarized text.
 */
export async function summarizeMessage(message: IMessage): Promise<string> {
    try {
        debug('Summarizing message ID: ' + message.getMessageId());
        const text = message.getText();
        
        if (!text || text.trim().length === 0) {
            return 'Empty message';
        }
        
        // Use advanced summarization with brief style for compatibility
        const result = await summarizationEngine.summarizeText(text, {
            maxLength: 100,
            style: 'brief'
        });
        
        return result.summary;
    } catch (error) {
        debug('Message summarization failed:', error);
        // Fallback to simple truncation
        const text = message.getText();
        return text.length > 100 ? text.substring(0, 97) + '...' : text;
    }
}

// Advanced export functions
export async function summarizeText(text: string, options?: SummarizationOptions): Promise<string> {
  try {
    const result = await summarizationEngine.summarizeText(text, options);
    return result.summary;
  } catch (error) {
    debug('Text summarization failed:', error);
    // Fallback to simple truncation
    return text.length > 200 ? text.substring(0, 197) + '...' : text;
  }
}

export async function summarizeTextAdvanced(text: string, options?: SummarizationOptions): Promise<SummarizationResult> {
  return summarizationEngine.summarizeText(text, options);
}

export async function summarizeConversation(
  messages: Array<{ content: string; author: string; timestamp: Date; channelId: string }>,
  options?: ConversationSummarizationOptions
): Promise<ConversationSummarizationResult> {
  return summarizationEngine.summarizeConversation(messages, options);
}

// Utility function to get conversation summary from database
export async function getStoredConversationSummaries(channelId: string, limit: number = 10): Promise<ConversationSummary[]> {
  try {
    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return [];
    }

    // This would need to be implemented in DatabaseManager
    // For now, return empty array
    debug(`Would retrieve ${limit} stored summaries for channel ${channelId}`);
    return [];
  } catch (error) {
    debug('Error retrieving stored summaries:', error);
    return [];
  }
}
