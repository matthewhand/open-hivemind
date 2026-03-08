const fs = require('fs');

// test-mcp-guard-ux.spec.ts
let guardUx = fs.readFileSync('tests/e2e/test-mcp-guard-ux.spec.ts', 'utf8');

// The file might be in conflict, let's clean it first
const search = `<<<<<<< HEAD
  // Wait for the badges to appear
  const badges = modal.locator('.badge', { hasText: /user1|user2/ });
  await expect(badges).toHaveCount(2);

  // Validate badge texts exactly
  const firstBadge = badges.nth(0);
  const secondBadge = badges.nth(1);
  await expect(firstBadge).toHaveText(/user1/);
  await expect(secondBadge).toHaveText(/user2/);

  // The input value itself is cleared after pressing Enter
  expect(await usersInput.inputValue()).toBe('');
=======
  const value = await usersInput.inputValue();
  console.log('Input value after typing ",user2":', value);
  expect(value).toBe('user1,user2');
<<<<<<< HEAD
=======

  await usersInput.press('Enter');

  // Give it a moment to render
  await page.waitForTimeout(500);

  // The input should be empty, and chips should be visible
  expect(await usersInput.inputValue()).toBe('');

  const chips = modal.locator('[data-testid="chip"]');
  await expect(chips).toHaveCount(2);

  // Wait for the clear button to be visible
  const clearButton = modal.locator('button[aria-label="Clear all items"]').first();
  await expect(clearButton).toBeVisible();

  // Take screenshot with chips
  await page.screenshot({ path: 'after-fix-feedback.png' });

  // Clear it
  await clearButton.click();

  // Give it a moment to render
  await page.waitForTimeout(500);

  // Verify it cleared
  await expect(clearButton).not.toBeVisible();
  await expect(chips).toHaveCount(0);

  const undoButton = modal.locator('button[aria-label="Undo"]').first();
  await undoButton.click();
  await expect(chips).toHaveCount(2);
  await page.screenshot({ path: 'docs/screenshots/mcp-guard-ux-after-undo.png' });
>>>>>>> origin/main
>>>>>>> origin/main`;

const replace = `  // Give it a moment to render
  await page.waitForTimeout(500);

  // The input should be empty, and chips should be visible
  await expect(usersInput).toHaveValue('');

  const chips = modal.locator('[data-testid="chip"]');
  await expect(chips).toHaveCount(2);

  // Wait for the clear button to be visible
  const clearButton = modal.locator('button[aria-label="Clear all items"]').first();
  await expect(clearButton).toBeVisible();

  // Take screenshot with chips
  await page.screenshot({ path: 'after-fix-feedback.png' });

  // Clear it
  await clearButton.click();

  // Give it a moment to render
  await page.waitForTimeout(500);

  // Verify it cleared
  await expect(clearButton).not.toBeVisible();
  await expect(chips).toHaveCount(0);

  const undoButton = modal.locator('button[aria-label="Undo"]').first();
  await undoButton.click();
  await expect(chips).toHaveCount(2);
  await page.screenshot({ path: 'docs/screenshots/mcp-guard-ux-after-undo.png' });`;

guardUx = guardUx.replace(search, replace);

// If it's already clean, just do the string replace for the value assertion
guardUx = guardUx.replace(/expect\(await usersInput\.inputValue\(\)\)\.toBe\(''\);/g, "await expect(usersInput).toHaveValue('');");
fs.writeFileSync('tests/e2e/test-mcp-guard-ux.spec.ts', guardUx);

// test-pagination-keyboard.spec.ts
let pagination = fs.readFileSync('tests/e2e/test-pagination-keyboard.spec.ts', 'utf8');
pagination = pagination.replace(/const currentDisplay = await page\.locator\('\[data-testid="current-page-display"\]'\)\.textContent\(\);\n\s*expect\(currentDisplay\)\.toBe\('Current state page: 12'\);/g, "await expect(page.locator('[data-testid=\"current-page-display\"]')).toHaveText('Current state page: 12');");

pagination = pagination.replace(/const ariaLive = await page\.locator\('\.sr-only\[aria-live="polite"\]'\)\.textContent\(\);\n\s*expect\(ariaLive\?\.trim\(\)\)\.toBe\('Page 20 of 20'\);/g, "await expect(page.locator('.sr-only[aria-live=\"polite\"]')).toHaveText('Page 20 of 20');");

pagination = pagination.replace(/const currentDisplay2 = await page\.locator\('\[data-testid="current-page-display"\]'\)\.textContent\(\);\n\s*expect\(currentDisplay2\)\.toBe\('Current state page: 11'\);/g, "await expect(page.locator('[data-testid=\"current-page-display\"]')).toHaveText('Current state page: 11');");

pagination = pagination.replace(/const ariaLive = await page\.locator\('\.sr-only\[aria-live="polite"\]'\)\.textContent\(\);\n\s*expect\(ariaLive\?\.trim\(\)\)\.toBe\('Page 11 of 20'\);/g, "await expect(page.locator('.sr-only[aria-live=\"polite\"]')).toHaveText('Page 11 of 20');");

fs.writeFileSync('tests/e2e/test-pagination-keyboard.spec.ts', pagination);

// test_config_rollback.spec.ts
let rollback = fs.readFileSync('tests/e2e/test_config_rollback.spec.ts', 'utf8');
rollback = rollback.replace(/expect\(await page\.locator\('div\.alert\.alert-success'\)\.isVisible\(\)\)\.toBe\(true\);/g, "await expect(page.locator('div.alert.alert-success')).toBeVisible();");
fs.writeFileSync('tests/e2e/test_config_rollback.spec.ts', rollback);
