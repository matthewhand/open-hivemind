import {
  loadProfiles,
  saveProfiles,
  findProfileByKey,
} from '../../src/config/profileUtils';
import { getLlmProfileByKey, loadLlmProfiles } from '../../src/config/llmProfiles';
import { getMemoryProfileByKey, loadMemoryProfiles } from '../../src/config/memoryProfiles';
import { getToolProfileByKey, loadToolProfiles } from '../../src/config/toolProfiles';
import * as fs from 'fs';
import * as path from 'path';

describe('Profile Management Integration', () => {
  const originalEnv = { ...process.env };
  let tempDir: string;

  beforeAll(() => {
    tempDir = path.join(process.cwd(), 'test-tmp', `profiles-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    process.env.NODE_CONFIG_DIR = tempDir;
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    process.env = originalEnv;
  });

  it('should correctly save, load, and retrieve an LLM profile', () => {
    // 1. Setup base profile data and test raw profileUtils
    const testData = {
      llm: [
        {
          key: 'test-llm',
          name: 'Test LLM',
          provider: 'openai',
          modelType: 'chat' as any,
          config: { model: 'gpt-4' }
        }
      ]
    };
    
    saveProfiles('llm-profiles.json', testData);
    
    // 2. Test actual wrapper `loadLlmProfiles`
    const loadedData = loadLlmProfiles();
    expect(loadedData.llm.length).toBeGreaterThan(0);
    expect(loadedData.llm[0].key).toBe('test-llm');

    // 3. Test `getLlmProfileByKey` cache/find logic
    const profile = getLlmProfileByKey('test-llm');
    expect(profile).toBeDefined();
    expect(profile?.provider).toBe('openai');
  });

  it('should correctly handle missing files gracefully', () => {
    // If memory profiles file does not exist, it should return default data
    const memData = loadMemoryProfiles();
    expect(memData.memory).toBeDefined();
    expect(Array.isArray(memData.memory)).toBe(true);

    const memProfile = getMemoryProfileByKey('missing-key');
    expect(memProfile).toBeUndefined();
  });

  it('should correctly save and load Tool profiles', () => {
    const testData = {
      tool: [
        {
          key: 'test-tool',
          name: 'Test Tool',
          provider: 'mcp-tool',
          config: {}
        }
      ]
    };

    saveProfiles('tool-profiles.json', testData);

    const loadedData = loadToolProfiles();
    expect(loadedData.tool).toBeDefined();
    expect(loadedData.tool.find(t => t.key === 'test-tool')).toBeDefined();

    const profile = getToolProfileByKey('test-tool');
    expect(profile).toBeDefined();
    expect(profile?.name).toBe('Test Tool');
  });
});
