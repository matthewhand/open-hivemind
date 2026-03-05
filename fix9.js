const fs = require('fs');
let content = fs.readFileSync('tests/e2e/test-mcp-guard-ux.spec.ts', 'utf8');
content = content.replace("await expect(page.locator('.badge-primary').first()).toHaveText('user1');\n  await expect(page.locator('.badge-primary').nth(1)).toHaveText('user2');", "await usersInput.press('Enter');\n  await expect(usersInput).toHaveValue('user1, user2');");
fs.writeFileSync('tests/e2e/test-mcp-guard-ux.spec.ts', content);
