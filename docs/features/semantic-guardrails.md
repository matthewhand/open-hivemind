# Semantic Guardrails

Semantic guardrails provide advanced LLM-based content filtering for both input and output messages. Unlike traditional keyword-based filters, semantic guardrails use AI to understand context, intent, and meaning to make more nuanced filtering decisions.

## Overview

The semantic guardrail system consists of two main components:

1. **Semantic Input Guardrail** - Filters user messages before processing
2. **Semantic Output Guardrail** - Filters bot responses before sending

Both guardrails use configurable LLM providers and prompts to evaluate content safety and appropriateness.

## Configuration

### Guard Profile Setup

Semantic guardrails are configured as part of guard profiles. You can enable them in the WebUI under **Configuration > Guard Profiles** or by editing the guard profile configuration:

```json
{
  "id": "semantic-protected",
  "name": "Semantic Protection",
  "description": "Advanced semantic filtering using LLM-based guardrails",
  "guards": {
    "semanticInputGuard": {
      "enabled": true,
      "llmProviderKey": "openai-gpt4",
      "prompt": "Analyze the following user input for harmful, inappropriate, or malicious content. Consider context, intent, and potential risks. Return true if the content is safe to process, false if it should be blocked.",
      "responseSchema": {
        "type": "boolean",
        "description": "Return true if input is safe, false if it should be blocked"
      }
    },
    "semanticOutputGuard": {
      "enabled": true,
      "llmProviderKey": "anthropic-claude",
      "prompt": "Review the following AI-generated response for harmful, inappropriate, biased, or potentially dangerous content. Consider accuracy, safety, and appropriateness. Return true if the response is safe to send, false if it should be blocked.",
      "responseSchema": {
        "type": "boolean",
        "description": "Return true if output is safe, false if it should be blocked"
      }
    }
  }
}
```

### Configuration Options

#### Semantic Input Guardrail
- **`enabled`** (boolean): Whether the input guardrail is active
- **`llmProviderKey`** (string, optional): Specific LLM provider to use for evaluation
- **`prompt`** (string): The prompt used to evaluate input content
- **`responseSchema`** (object, optional): Schema for structured LLM responses

#### Semantic Output Guardrail
- **`enabled`** (boolean): Whether the output guardrail is active
- **`llmProviderKey`** (string, optional): Specific LLM provider to use for evaluation
- **`prompt`** (string): The prompt used to evaluate output content
- **`responseSchema`** (object, optional): Schema for structured LLM responses

### Bot Configuration

To use semantic guardrails, assign a guard profile to your bot:

```json
{
  "name": "MyBot",
  "guardrailProfile": "semantic-protected"
}
```

## How It Works

### Input Processing Flow

1. User sends a message
2. Message passes through traditional content filters
3. **Semantic Input Guardrail** evaluates the message using LLM
4. If approved, message continues to bot processing
5. If blocked, user receives notification and message is logged

### Output Processing Flow

1. Bot generates a response
2. Response passes through traditional content filters
3. **Semantic Output Guardrail** evaluates the response using LLM
4. If approved, response is sent to user
5. If blocked, response is suppressed and incident is logged

### LLM Provider Selection

Semantic guardrails can use different LLM providers for evaluation:

- **Default**: Uses the bot's configured LLM provider
- **Specific**: Uses a designated LLM provider via `llmProviderKey`
- **Fallback**: Falls back to system default if specified provider unavailable

## Prompt Engineering

### Input Guardrail Prompts

Effective input prompts should:
- Clearly define what constitutes harmful content
- Consider context and intent
- Account for edge cases and nuanced scenarios
- Return clear boolean decisions

Example:
```
Analyze the following user input for harmful, inappropriate, or malicious content. 
Consider context, intent, and potential risks. Look for:
- Hate speech or discriminatory language
- Threats or violent content
- Attempts to manipulate or exploit the system
- Inappropriate sexual content
- Misinformation or harmful advice

Return true if the content is safe to process, false if it should be blocked.
```

### Output Guardrail Prompts

Effective output prompts should:
- Evaluate response safety and appropriateness
- Check for bias or harmful advice
- Ensure factual accuracy where possible
- Consider potential misuse of information

Example:
```
Review the following AI-generated response for harmful, inappropriate, biased, 
or potentially dangerous content. Consider:
- Accuracy and factual correctness
- Potential for harm or misuse
- Bias or discriminatory language
- Appropriateness for the context
- Compliance with safety guidelines

Return true if the response is safe to send, false if it should be blocked.
```

## Testing

### API Testing

You can test semantic guardrails using the test endpoint:

```bash
curl -X POST http://localhost:3028/api/guards/semantic/test \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Test message content",
    "guardrailType": "input",
    "guardrailConfig": {
      "enabled": true,
      "prompt": "Check if this content is safe",
      "llmProviderKey": "openai-gpt4"
    }
  }'
```

### Response Format

```json
{
  "success": true,
  "data": {
    "result": {
      "allowed": true,
      "reason": "Content approved by semantic analysis",
      "confidence": 0.95,
      "processingTime": 150
    },
    "testConfig": {
      "content": "Test message content",
      "guardrailType": "input",
      "guardrailEnabled": true
    }
  }
}
```

## Performance Considerations

### Latency
- Semantic guardrails add LLM inference latency to message processing
- Input guardrails affect user message response time
- Output guardrails affect bot response delivery time
- Consider using faster LLM providers for guardrails vs. main bot responses

### Cost
- Each guardrail evaluation consumes LLM tokens
- Input guardrails: ~50-200 tokens per message
- Output guardrails: ~100-500 tokens per response
- Consider cost implications when enabling on high-traffic bots

### Reliability
- Guardrails fail open (allow content) on LLM errors
- Implement monitoring for guardrail success rates
- Consider fallback mechanisms for critical applications

## Monitoring and Logging

### Audit Logs

Semantic guardrail decisions are logged with:
- Content evaluation results
- Processing time and confidence scores
- LLM provider used
- Guardrail configuration applied

### Metrics

Monitor these key metrics:
- Guardrail evaluation success rate
- Average processing time
- Block rate (percentage of content blocked)
- Error rate and failure modes

### Alerts

Consider alerting on:
- High block rates (potential false positives)
- High error rates (LLM provider issues)
- Unusual processing times (performance degradation)

## Best Practices

### Configuration
1. **Start Conservative**: Begin with stricter prompts and adjust based on results
2. **Test Thoroughly**: Use the test endpoint to validate prompts before deployment
3. **Monitor Closely**: Watch for false positives and negatives in production
4. **Regular Review**: Update prompts based on new threat patterns

### Prompt Design
1. **Be Specific**: Clearly define what should be blocked
2. **Provide Examples**: Include examples in prompts when helpful
3. **Consider Context**: Account for legitimate use cases that might seem harmful
4. **Iterate**: Refine prompts based on real-world performance

### Deployment
1. **Gradual Rollout**: Enable on low-traffic bots first
2. **A/B Testing**: Compare performance with and without guardrails
3. **Fallback Plans**: Have procedures for disabling if issues arise
4. **Documentation**: Keep detailed records of configuration changes

## Troubleshooting

### Common Issues

**High False Positive Rate**
- Review and refine guardrail prompts
- Consider context-specific adjustments
- Test with representative content samples

**High Latency**
- Use faster LLM providers for guardrails
- Optimize prompt length
- Consider caching for repeated content

**LLM Provider Errors**
- Verify provider configuration and API keys
- Check provider status and rate limits
- Implement retry logic with exponential backoff

**Inconsistent Results**
- Use temperature=0 for more deterministic results
- Implement structured output schemas
- Consider ensemble approaches with multiple providers

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
DEBUG=app:semanticGuardrail npm start
```

This will log detailed information about guardrail evaluations, including:
- LLM provider calls and responses
- Processing times and confidence scores
- Error details and stack traces