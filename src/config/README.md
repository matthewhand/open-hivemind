# ConfigurationManager - Overview

The `ConfigurationManager` class serves as a centralized manager for environment variables and configuration file values. It dynamically loads specific configurations based on the selected LLM provider.

## Components
- **OpenAIConfig**: Manages all OpenAI-specific settings.
- **ReplicateConfig**: Manages Replicate API settings.
- **PerplexityConfig**: Manages Perplexity AI settings.
- **N8NConfig**: Manages N8N API settings.
- **FlowiseConfig**: Manages Flowise API settings.
- **DiscordConfig**: Handles Discord-related settings.

## Dynamic Loading

The `ConfigurationManager` dynamically loads the appropriate configuration for the selected LLM provider. This can be done using the `loadLLMConfig` method:

```typescript
import ConfigurationManager from './config/ConfigurationManager';

const configManager = new ConfigurationManager();
const llmConfig = configManager.loadLLMConfig('openai');
console.log(llmConfig.OPENAI_API_KEY);
```
