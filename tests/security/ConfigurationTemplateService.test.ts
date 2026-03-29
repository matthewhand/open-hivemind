import * as path from 'path';
import { ConfigurationTemplateService } from '../../src/server/services/ConfigurationTemplateService';

describe('ConfigurationTemplateService Path Security', () => {
  let service: ConfigurationTemplateService;

  beforeEach(() => {
    service = ConfigurationTemplateService.getInstance();
  });

  it('getSafeTemplatePath should sanitize malicious template IDs via basename', () => {
    const maliciousId = '../../etc/passwd';
    // path.basename strips directory traversal, so the result should NOT contain ".."
    const result = (service as any).getSafeTemplatePath(maliciousId);
    expect(result).not.toContain('..');
    expect(path.basename(result)).toBe('passwd.json');
  });

  it('getSafeTemplatePath should return a valid path for safe IDs', () => {
    const safeId = 'my-template';
    const result = (service as any).getSafeTemplatePath(safeId);

    expect(result).toContain('config/templates/my-template.json');
  });
});
