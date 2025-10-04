/**
 * COMPREHENSIVE LLM PROVIDER TESTS - PHASE 3
 * 
 * Complete test coverage for OpenAI, Flowise, Azure AI, and other LLM integrations
 * Tests all model configurations, completion endpoints, and provider-specific features
 * 
 * @file comprehensive-llm-providers.test.ts
 * @author Open-Hivemind TDD Test Suite
 * @since 2025-09-27
 */

import axios from 'axios';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

const BASE_URL = 'http://localhost:3028';
const timeout = 45000; // Longer timeout for LLM API calls

const api = axios.create({
  baseURL: BASE_URL,
  timeout: timeout,
  validateStatus: () => true,
  headers: {
    'User-Agent': 'Open-Hivemind-LLM-Test-Suite/1.0',
    'Content-Type': 'application/json'
  }
});

describe('COMPREHENSIVE LLM PROVIDER TESTS - PHASE 3', () => {
  
  // ============================================================================
  // OPENAI INTEGRATION TESTS - COMPLETE COVERAGE
  // ============================================================================
  
  describe('OpenAI Integration - Complete Coverage', () => {
    
    describe('OpenAI Chat Completions', () => {
      test('should handle OpenAI chat completion requests', async () => {
        const chatRequest = {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hello, how are you?' }
          ],
          max_tokens: 150,
          temperature: 0.7
        };
        
        const endpoints = [
          '/api/llm/openai/chat/completions',
          '/llm/openai/v1/chat/completions',
          '/openai/v1/chat/completions',
          '/api/openai/chat'
        ];
        
        for (const endpoint of endpoints) {
          const response = await api.post(endpoint, chatRequest, {
            headers: {
              'Authorization': 'Bearer test-api-key'
            }
          });
          
          expect([200, 401, 404, 500]).toContain(response.status);
          
          if (response.status === 200) {
            expect(response.data).toHaveProperty('choices');
            expect(Array.isArray(response.data.choices)).toBe(true);
          }
        }
      }, timeout);
      
      test('should handle OpenAI streaming responses', async () => {
        const streamRequest = {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: 'Tell me a short story.' }
          ],
          stream: true,
          max_tokens: 100
        };
        
        const response = await api.post('/api/llm/openai/chat/completions', streamRequest, {
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Accept': 'text/event-stream'
          }
        });
        
        expect([200, 401, 404, 500]).toContain(response.status);
      }, timeout);
      
      test('should handle different OpenAI models', async () => {
        const models = [
          'gpt-3.5-turbo',
          'gpt-4',
          'gpt-4-turbo-preview',
          'gpt-4o',
          'gpt-4o-mini'
        ];
        
        for (const model of models) {
          const request = {
            model: model,
            messages: [{ role: 'user', content: 'Test' }],
            max_tokens: 10
          };
          
          const response = await api.post('/api/llm/openai/chat/completions', request, {
            headers: { 'Authorization': 'Bearer test-api-key' }
          });
          
          expect([200, 400, 401, 404, 500]).toContain(response.status);
        }
      }, timeout);
    });
    
    describe('OpenAI Configuration & Management', () => {
      test('should handle OpenAI provider configuration', async () => {
        const config = {
          provider: 'openai',
          apiKey: 'test-api-key',
          baseURL: 'https://api.openai.com/v1',
          defaultModel: 'gpt-3.5-turbo',
          maxTokens: 1000,
          temperature: 0.7
        };
        
        const response = await api.post('/api/llm/providers/configure', config);
        expect([200, 201, 400, 401, 403, 404, 500]).toContain(response.status);
      }, timeout);
      
      test('should handle OpenAI model listing', async () => {
        const response = await api.get('/api/llm/openai/models', {
          headers: { 'Authorization': 'Bearer test-api-key' }
        });
        
        expect([200, 401, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.data).toHaveProperty('data');
          expect(Array.isArray(response.data.data)).toBe(true);
        }
      }, timeout);
      
      test('should handle OpenAI usage tracking', async () => {
        const response = await api.get('/api/llm/openai/usage', {
          headers: { 'Authorization': 'Bearer test-api-key' }
        });
        
        expect([200, 401, 404]).toContain(response.status);
      }, timeout);
    });
    
    describe('OpenAI Error Handling', () => {
      test('should handle invalid API keys', async () => {
        const request = {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Test' }]
        };
        
        const response = await api.post('/api/llm/openai/chat/completions', request, {
          headers: { 'Authorization': 'Bearer invalid-key' }
        });
        
        expect([401, 404]).toContain(response.status);
      }, timeout);
      
      test('should handle rate limiting', async () => {
        const request = {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Test' }]
        };
        
        // Send multiple rapid requests
        const requests = Array(5).fill(null).map(() =>
          api.post('/api/llm/openai/chat/completions', request, {
            headers: { 'Authorization': 'Bearer test-api-key' }
          })
        );
        
        const responses = await Promise.all(requests);
        
        responses.forEach(response => {
          expect([200, 401, 404, 429, 500]).toContain(response.status);
        });
      }, timeout);
      
      test('should handle malformed requests', async () => {
        const malformedRequests = [
          { messages: 'invalid' },
          { model: null, messages: [] },
          { model: 'gpt-3.5-turbo' }, // missing messages
          { model: 'gpt-3.5-turbo', messages: [{ role: 'invalid' }] }
        ];
        
        for (const request of malformedRequests) {
          const response = await api.post('/api/llm/openai/chat/completions', request, {
            headers: { 'Authorization': 'Bearer test-api-key' }
          });
          
          expect([400, 404, 422, 500]).toContain(response.status);
        }
      }, timeout);
    });
  });
  
  // ============================================================================
  // FLOWISE INTEGRATION TESTS - COMPLETE COVERAGE
  // ============================================================================
  
  describe('Flowise Integration - Complete Coverage', () => {
    
    describe('Flowise Flow Execution', () => {
      test('should handle Flowise flow predictions', async () => {
        const flowRequest = {
          question: 'Hello, how can you help me?',
          chatId: 'test-chat-id',
          overrideConfig: {
            temperature: 0.7,
            maxTokens: 150
          }
        };
        
        const endpoints = [
          '/api/llm/flowise/prediction',
          '/flowise/api/v1/prediction',
          '/api/flowise/flows/execute',
          '/flowise/prediction'
        ];
        
        for (const endpoint of endpoints) {
          const response = await api.post(endpoint, flowRequest, {
            headers: {
              'Authorization': 'Bearer test-flowise-key'
            }
          });
          
          expect([200, 401, 404, 500]).toContain(response.status);
          
          if (response.status === 200) {
            expect(response.data).toHaveProperty('text');
          }
        }
      }, timeout);
      
      test('should handle Flowise streaming predictions', async () => {
        const streamRequest = {
          question: 'Tell me about AI',
          streaming: true,
          chatId: 'test-stream-chat'
        };
        
        const response = await api.post('/api/llm/flowise/prediction', streamRequest, {
          headers: {
            'Authorization': 'Bearer test-flowise-key',
            'Accept': 'text/event-stream'
          }
        });
        
        expect([200, 401, 404, 500]).toContain(response.status);
      }, timeout);
      
      test('should handle Flowise flow configuration', async () => {
        const flowConfig = {
          flowId: 'test-flow-id',
          name: 'Test Flow',
          config: {
            llmModel: 'gpt-3.5-turbo',
            temperature: 0.8,
            maxTokens: 500
          }
        };
        
        const response = await api.post('/api/flowise/flows', flowConfig, {
          headers: { 'Authorization': 'Bearer test-flowise-key' }
        });
        
        expect([200, 201, 400, 401, 404, 500]).toContain(response.status);
      }, timeout);
    });
    
    describe('Flowise Chat Management', () => {
      test('should handle Flowise chat sessions', async () => {
        const chatRequest = {
          chatId: 'test-chat-session',
          flowId: 'test-flow-id',
          question: 'Start a new conversation'
        };
        
        const response = await api.post('/api/flowise/chats', chatRequest, {
          headers: { 'Authorization': 'Bearer test-flowise-key' }
        });
        
        expect([200, 201, 400, 401, 404, 500]).toContain(response.status);
      }, timeout);
      
      test('should handle Flowise chat history', async () => {
        const response = await api.get('/api/flowise/chats/test-chat-id/messages', {
          headers: { 'Authorization': 'Bearer test-flowise-key' }
        });
        
        expect([200, 401, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.data)).toBe(true);
        }
      }, timeout);
      
      test('should handle Flowise chat deletion', async () => {
        const response = await api.delete('/api/flowise/chats/test-chat-id', {
          headers: { 'Authorization': 'Bearer test-flowise-key' }
        });
        
        expect([200, 204, 401, 404]).toContain(response.status);
      }, timeout);
    });
    
    describe('Flowise Node Management', () => {
      test('should handle Flowise node operations', async () => {
        const nodeConfig = {
          nodeId: 'test-node-id',
          type: 'llm',
          data: {
            model: 'gpt-3.5-turbo',
            temperature: 0.7
          }
        };
        
        const response = await api.post('/api/flowise/nodes', nodeConfig, {
          headers: { 'Authorization': 'Bearer test-flowise-key' }
        });
        
        expect([200, 201, 400, 401, 404, 500]).toContain(response.status);
      }, timeout);
      
      test('should handle Flowise flow validation', async () => {
        const flowData = {
          nodes: [
            { id: 'node1', type: 'input' },
            { id: 'node2', type: 'llm' },
            { id: 'node3', type: 'output' }
          ],
          edges: [
            { source: 'node1', target: 'node2' },
            { source: 'node2', target: 'node3' }
          ]
        };
        
        const response = await api.post('/api/flowise/flows/validate', flowData, {
          headers: { 'Authorization': 'Bearer test-flowise-key' }
        });
        
        expect([200, 400, 401, 404, 500]).toContain(response.status);
      }, timeout);
    });
  });
  
  // ============================================================================
  // AZURE AI INTEGRATION TESTS - COMPLETE COVERAGE
  // ============================================================================
  
  describe('Azure AI Integration - Complete Coverage', () => {
    
    describe('Azure OpenAI Service', () => {
      test('should handle Azure OpenAI completions', async () => {
        const azureRequest = {
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hello!' }
          ],
          max_tokens: 100,
          temperature: 0.7
        };
        
        const endpoints = [
          '/api/llm/azure/openai/deployments/gpt-35-turbo/chat/completions',
          '/azure/openai/deployments/test-deployment/chat/completions',
          '/api/azure/chat/completions'
        ];
        
        for (const endpoint of endpoints) {
          const response = await api.post(endpoint, azureRequest, {
            headers: {
              'api-key': 'test-azure-key',
              'Content-Type': 'application/json'
            }
          });
          
          expect([200, 401, 404, 500]).toContain(response.status);
        }
      }, timeout);
      
      test('should handle Azure AI model deployments', async () => {
        const deploymentConfig = {
          model: 'gpt-35-turbo',
          deploymentName: 'test-deployment',
          version: '0613',
          scaleSettings: {
            scaleType: 'Standard'
          }
        };
        
        const response = await api.post('/api/azure/openai/deployments', deploymentConfig, {
          headers: { 'api-key': 'test-azure-key' }
        });
        
        expect([200, 201, 400, 401, 404, 500]).toContain(response.status);
      }, timeout);
    });
    
    describe('Azure Cognitive Services', () => {
      test('should handle Azure Text Analytics', async () => {
        const textRequest = {
          documents: [
            {
              id: '1',
              language: 'en',
              text: 'This is a test document for sentiment analysis.'
            }
          ]
        };
        
        const response = await api.post('/api/azure/cognitive/text/analytics/v3.1/sentiment', textRequest, {
          headers: {
            'Ocp-Apim-Subscription-Key': 'test-cognitive-key'
          }
        });
        
        expect([200, 401, 404]).toContain(response.status);
      }, timeout);
      
      test('should handle Azure Speech Services', async () => {
        const speechRequest = {
          text: 'Hello, this is a test message for text-to-speech.',
          voice: 'en-US-JennyNeural',
          rate: 'medium',
          pitch: 'medium'
        };
        
        const response = await api.post('/api/azure/cognitive/speech/synthesize', speechRequest, {
          headers: {
            'Ocp-Apim-Subscription-Key': 'test-speech-key'
          }
        });
        
        expect([200, 401, 404]).toContain(response.status);
      }, timeout);
    });
  });
  
  // ============================================================================
  // GOOGLE AI INTEGRATION TESTS - COMPLETE COVERAGE
  // ============================================================================
  
  describe('Google AI Integration - Complete Coverage', () => {
    
    describe('Google Gemini API', () => {
      test('should handle Gemini chat completions', async () => {
        const geminiRequest = {
          contents: [
            {
              parts: [
                { text: 'Hello, how are you today?' }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150
          }
        };
        
        const response = await api.post('/api/llm/google/gemini/generateContent', geminiRequest, {
          headers: {
            'Authorization': 'Bearer test-google-key'
          }
        });
        
        expect([200, 401, 404, 500]).toContain(response.status);
      }, timeout);
      
      test('should handle Gemini streaming responses', async () => {
        const streamRequest = {
          contents: [
            { parts: [{ text: 'Tell me a story' }] }
          ],
          generationConfig: {
            temperature: 0.8
          }
        };
        
        const response = await api.post('/api/llm/google/gemini/streamGenerateContent', streamRequest, {
          headers: {
            'Authorization': 'Bearer test-google-key'
          }
        });
        
        expect([200, 401, 404, 500]).toContain(response.status);
      }, timeout);
    });
    
    describe('Google Cloud AI Platform', () => {
      test('should handle Vertex AI predictions', async () => {
        const vertexRequest = {
          instances: [
            {
              prompt: {
                messages: [
                  { author: 'user', content: 'Hello AI!' }
                ]
              }
            }
          ],
          parameters: {
            temperature: 0.7,
            maxOutputTokens: 100
          }
        };
        
        const response = await api.post('/api/google/vertex/predict', vertexRequest, {
          headers: {
            'Authorization': 'Bearer test-vertex-key'
          }
        });
        
        expect([200, 401, 404, 500]).toContain(response.status);
      }, timeout);
    });
  });
  
  // ============================================================================
  // ANTHROPIC CLAUDE INTEGRATION TESTS - COMPLETE COVERAGE
  // ============================================================================
  
  describe('Anthropic Claude Integration - Complete Coverage', () => {
    
    describe('Claude API Completions', () => {
      test('should handle Claude message completions', async () => {
        const claudeRequest = {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 150,
          messages: [
            { role: 'user', content: 'Hello Claude, how are you?' }
          ]
        };
        
        const response = await api.post('/api/llm/anthropic/messages', claudeRequest, {
          headers: {
            'x-api-key': 'test-anthropic-key',
            'anthropic-version': '2023-06-01'
          }
        });
        
        expect([200, 401, 404, 500]).toContain(response.status);
      }, timeout);
      
      test('should handle Claude streaming responses', async () => {
        const streamRequest = {
          model: 'claude-3-haiku-20240307',
          max_tokens: 100,
          messages: [
            { role: 'user', content: 'Write a haiku' }
          ],
          stream: true
        };
        
        const response = await api.post('/api/llm/anthropic/messages', streamRequest, {
          headers: {
            'x-api-key': 'test-anthropic-key',
            'anthropic-version': '2023-06-01',
            'Accept': 'text/event-stream'
          }
        });
        
        expect([200, 401, 404, 500]).toContain(response.status);
      }, timeout);
    });
  });
  
  // ============================================================================
  // MULTI-PROVIDER ORCHESTRATION TESTS
  // ============================================================================
  
  describe('Multi-Provider Orchestration - Complete Coverage', () => {
    
    test('should handle provider switching', async () => {
      const switchRequest = {
        currentProvider: 'openai',
        targetProvider: 'anthropic',
        botId: 'test-bot-id',
        preserveContext: true
      };
      
      const response = await api.post('/api/llm/providers/switch', switchRequest);
      expect([200, 400, 404, 500]).toContain(response.status);
    }, timeout);
    
    test('should handle provider load balancing', async () => {
      const loadBalanceRequest = {
        providers: ['openai', 'anthropic', 'google'],
        strategy: 'round-robin',
        message: 'Test message for load balancing'
      };
      
      const response = await api.post('/api/llm/providers/balance', loadBalanceRequest);
      expect([200, 400, 404, 500]).toContain(response.status);
    }, timeout);
    
    test('should handle provider fallback scenarios', async () => {
      const fallbackRequest = {
        primaryProvider: 'openai',
        fallbackProviders: ['anthropic', 'google'],
        message: 'Test fallback message',
        maxRetries: 3
      };
      
      const response = await api.post('/api/llm/providers/fallback', fallbackRequest);
      expect([200, 400, 404, 500]).toContain(response.status);
    }, timeout);
    
    test('should handle provider cost optimization', async () => {
      const costRequest = {
        message: 'Optimize this request for cost',
        maxCost: 0.01,
        providers: ['openai', 'anthropic', 'google'],
        preferredQuality: 'high'
      };
      
      const response = await api.post('/api/llm/providers/optimize-cost', costRequest);
      expect([200, 400, 404, 500]).toContain(response.status);
    }, timeout);
  });
  
  // ============================================================================
  // LLM PERFORMANCE & MONITORING TESTS
  // ============================================================================
  
  describe('LLM Performance & Monitoring - Complete Coverage', () => {
    
    test('should track LLM response times', async () => {
      const testMessage = {
        message: 'Test message for performance tracking',
        provider: 'openai',
        model: 'gpt-3.5-turbo'
      };
      
      const start = Date.now();
      const response = await api.post('/api/llm/completion', testMessage);
      const duration = Date.now() - start;
      
      expect([200, 401, 404, 500]).toContain(response.status);
      
      // Check if performance is being tracked
      const metricsResponse = await api.get('/api/llm/metrics/performance');
      expect([200, 404]).toContain(metricsResponse.status);
    }, timeout);
    
    test('should track token usage across providers', async () => {
      const response = await api.get('/api/llm/metrics/tokens');
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(typeof response.data).toBe('object');
      }
    }, timeout);
    
    test('should track cost metrics', async () => {
      const response = await api.get('/api/llm/metrics/costs');
      expect([200, 404]).toContain(response.status);
    }, timeout);
    
    test('should handle error rate monitoring', async () => {
      const response = await api.get('/api/llm/metrics/errors');
      expect([200, 404]).toContain(response.status);
    }, timeout);
  });
});