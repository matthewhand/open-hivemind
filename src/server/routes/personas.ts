import Debug from 'debug';
import { Router } from 'express';
import { getLlmProfileByKey } from '../../config/llmProfiles';
import { UserConfigStore } from '../../config/UserConfigStore';
import { FlowiseProvider } from '../../integrations/flowise/flowiseProvider';
import * as openWebUIImport from '../../integrations/openwebui/runInference';
import type { ILlmProvider } from '../../llm/interfaces/ILlmProvider';
import { PersonaManager } from '../../managers/PersonaManager';
import { IMessage } from '../../message/interfaces/IMessage';

const debug = Debug('app:personas');
const router = Router();
const manager = PersonaManager.getInstance();

// Simple concrete implementation of IMessage for internal use
class SimpleMessage extends IMessage {
  constructor(role: string, content: string) {
    super({}, role);
    this.content = content;
  }

  getMessageId(): string {
    return 'generated-' + Date.now();
  }
  getTimestamp(): Date {
    return new Date();
  }
  setText(text: string): void {
    this.content = text;
  }
  getChannelId(): string {
    return 'internal-persona-test';
  }
  getAuthorId(): string {
    return 'system';
  }
  getChannelTopic(): string | null {
    return null;
  }
  getUserMentions(): string[] {
    return [];
  }
  getChannelUsers(): string[] {
    return [];
  }
  mentionsUsers(_userId: string): boolean {
    return false;
  }
  isFromBot(): boolean {
    return this.role === 'assistant';
  }
  getAuthorName(): string {
    return this.role;
  }
}

// Define OpenWebUI provider locally
const openWebUI: ILlmProvider = {
  name: 'openwebui',
  supportsChatCompletion: () => true,
  supportsCompletion: () => false,
  generateChatCompletion: async (
    userMessage: string,
    historyMessages: IMessage[],
    metadata?: Record<string, any>
  ) => {
    if (openWebUIImport.generateChatCompletion.length === 3) {
      const result = await openWebUIImport.generateChatCompletion(
        userMessage,
        historyMessages,
        metadata
      );
      return result.text || '';
    } else {
      const result = await openWebUIImport.generateChatCompletion(userMessage, historyMessages);
      return result.text || '';
    }
  },
  generateCompletion: async () => {
    throw new Error('Non-chat completion not supported by OpenWebUI');
  },
};

// GET /api/personas
router.get('/', (req, res) => {
  try {
    const personas = manager.getAllPersonas();
    return res.json(personas);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/personas/:id
router.get('/:id', (req, res) => {
  try {
    const persona = manager.getPersona(req.params.id);
    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }
    return res.json(persona);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/personas
router.post('/', async (req, res) => {
  try {
    const newPersona = manager.createPersona(req.body);
    return res.status(201).json(newPersona);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// POST /api/personas/:id/chat - Chat with a persona
router.post('/:id/chat', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const persona = manager.getPersona(id);
    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    // Get configured AI provider
    const userConfig = UserConfigStore.getInstance();
    const settings = userConfig.getGeneralSettings();
    const providerKey = settings.webuiIntelligenceProvider;

    if (!providerKey || providerKey === 'none') {
      return res
        .status(400)
        .json({ error: 'AI Assistance is not configured. Please configure it in Settings.' });
    }

    const profile = getLlmProfileByKey(providerKey);
    if (!profile) {
      return res.status(404).json({ error: 'Configured AI provider profile not found.' });
    }

    let instance: ILlmProvider | undefined;
    try {
      switch (profile.provider.toLowerCase()) {
        case 'openai':
          const { OpenAiProvider } = require('@hivemind/provider-openai');
          instance = new OpenAiProvider(profile.config);
          break;
        case 'flowise':
          instance = new FlowiseProvider(profile.config);
          break;
        case 'openwebui':
          instance = openWebUI;
          break;
        default:
          return res.status(400).json({ error: `Unsupported provider type: ${profile.provider}` });
      }
    } catch (error: any) {
      debug(`Failed to initialize provider ${profile.name}:`, error);
      return res.status(500).json({ error: `Failed to initialize provider: ${error.message}` });
    }

    if (!instance) {
      return res.status(500).json({ error: 'Failed to instantiate provider instance.' });
    }

    // Construct messages
    const history: IMessage[] = [];
    if (persona.systemPrompt) {
      history.push(new SimpleMessage('system', persona.systemPrompt));
    }

    let result = '';
    if (instance.supportsChatCompletion()) {
      result = await instance.generateChatCompletion(message, history);
    } else if (instance.supportsCompletion()) {
      const fullPrompt = `${persona.systemPrompt}\n\nUser: ${message}\nAssistant:`;
      result = await instance.generateCompletion(fullPrompt);
    } else {
      return res.status(400).json({ error: 'Provider does not support generation.' });
    }

    return res.json({ reply: result });
  } catch (error: any) {
    debug('Error in Persona Chat:', error);
    return res.status(500).json({
      error: 'Failed to generate response',
      message: error.message,
    });
  }
});

// POST /api/personas/:id/clone
router.post('/:id/clone', (req, res) => {
  try {
    const clonedPersona = manager.clonePersona(req.params.id, req.body);
    return res.status(201).json(clonedPersona);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  }
});

// PUT /api/personas/:id
router.put('/:id', async (req, res) => {
  try {
    const updatedPersona = manager.updatePersona(req.params.id, req.body);
    return res.json(updatedPersona);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// DELETE /api/personas/:id
router.delete('/:id', (req, res) => {
  try {
    const success = manager.deletePersona(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Persona not found' });
    }
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
