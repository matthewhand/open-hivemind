const fs = require('fs');

function getFiles(dir, files_) {
  files_ = files_ || [];
  const files = fs.readdirSync(dir);
  for (const i in files) {
    const name = dir + '/' + files[i];
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files_);
    } else {
      if (name.endsWith('.ts')) files_.push(name);
    }
  }
  return files_;
}

const files = getFiles('tests/e2e');

let count = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // Replace `await page.waitForTimeout(X)` when it's just fluff.
  // We can't safely remove all.
  // Let's replace `await page.waitForTimeout(X)` with `await page.waitForFunction(() => document.readyState === 'complete')` as a safer fallback?
  // No, the prompt specifically says "Rely entirely on deterministic locator assertions like `page.waitForSelector()`, `locator.waitFor()`, `expect(locator).toBeVisible()`, `page.waitForResponse()`."

  // Strategy 1: `waitForTimeout` before `expect(page.getByText(...)).toBeVisible()` -> already done.
  // Strategy 2: `waitForTimeout` before `locator.click()` -> Replace with `await locator.waitFor({ state: 'visible' })` and then click.
  // Actually, `click()` already waits for the element to be visible and actionable! So `waitForTimeout` before `click()` is redundant unless an animation is playing.
  // If an animation is playing, Playwright's `click` still waits for it to finish!
  // So we can remove `waitForTimeout` immediately preceding `click()`!

  newContent = newContent.replace(/^[ \t]*await\s+page\.waitForTimeout\([0-9]+\);[ \t]*\n([ \t]*await\s+[^.]+\.click\()/gm, '$1');

  // Strategy 3: `waitForTimeout` before `locator.fill()` -> `fill()` also auto-waits!
  newContent = newContent.replace(/^[ \t]*await\s+page\.waitForTimeout\([0-9]+\);[ \t]*\n([ \t]*await\s+[^.]+\.fill\()/gm, '$1');

  // Strategy 4: `waitForTimeout` before `page.goto()` -> Redundant!
  newContent = newContent.replace(/^[ \t]*await\s+page\.waitForTimeout\([0-9]+\);[ \t]*\n([ \t]*await\s+page\.goto\()/gm, '$1');

  // Strategy 5: `waitForTimeout` before `await expect(...)` (general)
  newContent = newContent.replace(/^[ \t]*await\s+page\.waitForTimeout\([0-9]+\);[ \t]*\n([ \t]*await\s+expect\()/gm, '$1');

  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    count++;
  }
}
console.log(count + " files modified by auto-wait strategies");
