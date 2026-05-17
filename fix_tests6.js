const fs = require('fs');

let content = fs.readFileSync('tests/database/Encryption.test.ts', 'utf8');

const regex1 = /describe\('Database At-Rest Encryption', \(\) => \{/g;
content = content.replace(regex1, `describe('Database At-Rest Encryption', () => {
  beforeAll(() => {
    const encService = require('../../src/database/EncryptionService').EncryptionService;
    encService.instance = undefined;
    const instance = encService.getInstance();
    instance.encryptionKey = Buffer.from('12345678901234567890123456789012');
  });

  afterAll(() => {
    const encService = require('../../src/database/EncryptionService').EncryptionService;
    encService.instance = undefined;
    encService.getInstance();
  });
`);

fs.writeFileSync('tests/database/Encryption.test.ts', content, 'utf8');
