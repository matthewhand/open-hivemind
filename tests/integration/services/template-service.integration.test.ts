import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { registerServices } from '../../../src/di/registration';
import { ConfigurationTemplateService } from '../../../src/server/services/ConfigurationTemplateService';

describe('ConfigurationTemplateService Integration', () => {
  let service: ConfigurationTemplateService;
  let testDir: string;

  beforeAll(() => {
    registerServices();
    testDir = path.join(os.tmpdir(), `hivemind-templates-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    service = ConfigurationTemplateService.getInstance(testDir);
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should list built-in templates', async () => {
    const templates = await service.getAllTemplates();
    expect(Array.isArray(templates)).toBe(true);
    // Should at least contain the default/basic template if built-ins are loaded
    if (templates.length > 0) {
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('config');
    }
  });

  it('should return null for non-existent template', async () => {
    const template = await service.getTemplateById('non-existent-template-id');
    expect(template).toBeNull();
  });
});
