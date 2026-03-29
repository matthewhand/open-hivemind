import crypto from 'crypto';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { ErrorUtils } from '../types/errors';

const debug = Debug('app:PersonaManager');

export interface Persona {
  id: string;
  name: string;
  description: string;
  category:
    | 'general'
    | 'customer_service'
    | 'creative'
    | 'technical'
    | 'educational'
    | 'entertainment'
    | 'professional';
  traits: { name: string; value: string; weight?: number; type?: string }[];
  systemPrompt: string;
  isBuiltIn?: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePersonaRequest {
  name: string;
  description: string;
  category: Persona['category'];
  traits: Persona['traits'];
  systemPrompt: string;
}

export interface UpdatePersonaRequest extends Partial<CreatePersonaRequest> {}

// Built-in personas that are always available
export const BUILTIN_PERSONAS: Persona[] = [
  {
    id: 'default',
    name: 'Helpful Assistant',
    description: 'A friendly and helpful AI assistant',
    category: 'general',
    systemPrompt:
      'You are a helpful assistant. Be polite, professional, and provide accurate information.',
    traits: [
      { name: 'Tone', value: 'Friendly', weight: 1, type: 'tone' },
      { name: 'Style', value: 'Professional', weight: 1, type: 'style' },
    ],
    isBuiltIn: true,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'creative_writer',
    name: 'Creative Writer',
    description: 'Imaginative and artistic content creator',
    category: 'creative',
    systemPrompt: 'You are a creative writer. Use vivid language and engaging storytelling.',
    traits: [
      { name: 'Tone', value: 'Creative', weight: 1, type: 'tone' },
      { name: 'Style', value: 'Artistic', weight: 1, type: 'style' },
    ],
    isBuiltIn: true,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'technical_support',
    name: 'Technical Support',
    description: 'Knowledgeable technical support expert',
    category: 'technical',
    systemPrompt: 'You are a technical support specialist. Provide clear, step-by-step assistance.',
    traits: [
      { name: 'Tone', value: 'Analytical', weight: 1, type: 'tone' },
      { name: 'Style', value: 'Technical', weight: 1, type: 'style' },
    ],
    isBuiltIn: true,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export class PersonaManager extends EventEmitter {
  private static instance: PersonaManager;
  private personas = new Map<string, Persona>();
  private personasFilePath: string;

  private constructor() {
    super();
    this.personasFilePath = path.join(process.cwd(), 'config', 'user', 'custom-personas.json');
    // Note: loadPersonas is now async but called from constructor
    // We'll handle initialization separately
    debug('PersonaManager initialized');
  }

  public static async getInstance(): Promise<PersonaManager> {
    if (!PersonaManager.instance) {
      PersonaManager.instance = new PersonaManager();
      await PersonaManager.instance.loadPersonas();
    }
    return PersonaManager.instance;
  }

  private async loadPersonas(): Promise<void> {
    try {
      // Clear existing personas (for reload functionality)
      this.personas.clear();

      // Load built-ins first
      BUILTIN_PERSONAS.forEach((p) => this.personas.set(p.id, { ...p }));

      try {
        await fs.promises.access(this.personasFilePath);
        const data = await fs.promises.readFile(this.personasFilePath, 'utf8');
        const customPersonas = JSON.parse(data);

        Object.values(customPersonas).forEach((p: any) => {
          // Determine ID if not present (migration) or just use id
          if (p.id) {
            this.personas.set(p.id, p);
          }
        });
        debug(`Loaded ${Object.keys(customPersonas).length} custom personas`);
      } catch (err: any) {
        if (err.code !== 'ENOENT') throw err;
        // File doesn't exist yet, that's ok
      }
    } catch (error: any) {
      debug('Error loading personas:', ErrorUtils.getMessage(error));
    }
  }

  /**
   * Reload personas from disk (useful for runtime refresh without restart)
   */
  public async reloadPersonas(): Promise<void> {
    debug('Reloading personas from disk');
    await this.loadPersonas();
    this.emit('personasReloaded');
  }

  private async savePersonas(): Promise<void> {
    try {
      const personasDir = path.dirname(this.personasFilePath);
      try {
        await fs.promises.access(personasDir);
      } catch {
        await fs.promises.mkdir(personasDir, { recursive: true });
      }

      // Filter out built-ins before saving
      const customPersonas: Record<string, Persona> = {};
      for (const [id, persona] of this.personas.entries()) {
        if (!persona.isBuiltIn) {
          customPersonas[id] = persona;
        }
      }

      await fs.promises.writeFile(this.personasFilePath, JSON.stringify(customPersonas, null, 2));
      debug(`Saved ${Object.keys(customPersonas).length} custom personas`);
    } catch (error: any) {
      debug('Error saving personas:', ErrorUtils.getMessage(error));
      throw ErrorUtils.createError('Failed to save personas', 'configuration');
    }
  }

  public getAllPersonas(): Persona[] {
    return Array.from(this.personas.values());
  }

  public getPersona(id: string): Persona | undefined {
    return this.personas.get(id);
  }

  public async createPersona(request: CreatePersonaRequest): Promise<Persona> {
    const id = crypto.randomUUID();
    const newPersona: Persona = {
      id,
      ...request,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.personas.set(id, newPersona);
    await this.savePersonas();
    this.emit('personaCreated', newPersona);
    return newPersona;
  }

  public async updatePersona(id: string, updates: UpdatePersonaRequest): Promise<Persona> {
    const existing = this.personas.get(id);
    if (!existing) {
      throw new Error(`Persona with ID ${id} not found`);
    }

    if (existing.isBuiltIn) {
      throw new Error('Cannot update built-in personas');
    }

    const updated: Persona = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.personas.set(id, updated);
    await this.savePersonas();
    this.emit('personaUpdated', updated);
    return updated;
  }

  public async clonePersona(id: string, overrides?: Partial<CreatePersonaRequest>): Promise<Persona> {
    const existing = this.personas.get(id);
    if (!existing) {
      throw new Error(`Persona with ID ${id} not found`);
    }

    const newId = crypto.randomUUID();
    const clonedPersona: Persona = {
      ...existing,
      ...overrides,
      id: newId,
      isBuiltIn: false, // Cloned personas are always custom
      usageCount: 0, // Reset usage count for cloned personas
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.personas.set(newId, clonedPersona);
    await this.savePersonas();
    this.emit('personaCreated', clonedPersona);
    return clonedPersona;
  }

  public async deletePersona(id: string): Promise<boolean> {
    const existing = this.personas.get(id);
    if (!existing) {
      return false;
    }

    if (existing.isBuiltIn) {
      throw new Error('Cannot delete built-in personas');
    }

    this.personas.delete(id);
    await this.savePersonas();
    this.emit('personaDeleted', id);
    return true;
  }

  public async incrementUsageCount(id: string): Promise<boolean> {
    const persona = this.personas.get(id);
    if (!persona) {
      return false;
    }

    const updated: Persona = {
      ...persona,
      usageCount: (persona.usageCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    this.personas.set(id, updated);
    await this.savePersonas();
    this.emit('personaUsed', updated);
    return true;
  }
}
