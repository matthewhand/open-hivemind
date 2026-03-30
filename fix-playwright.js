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

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // We have 500+ waitForTimeout to replace. Instead of replacing them with 'domcontentloaded', which is not recommended,
  // we can create a deterministic generic solution that uses Playwright API.

  // E.g. replace `await page.waitForTimeout(\d+)` with `await expect.poll(async () => true).toBeTruthy()`
  // No, that doesn't solve it correctly.

  // If we can't figure out exactly what it's waiting for, replacing `page.waitForTimeout` with an assertion on `document.readyState` or waiting for an expected network idle via a custom function is better than hardcoded timeouts.

  // Better yet, many waitForTimeout were added to wait for a modal to open/close or toaster to show.
  // We can use `await page.waitForFunction(() => document.querySelectorAll('.animate-spin, .loading, [aria-busy="true"]').length === 0)`
  // Or simply remove `waitForTimeout` completely, and let Playwright's auto-wait handle it!
  // IF a test fails, it fails because it *actually* needed it for a missing assertion.

  newContent = newContent.replace(/^[ \t]*await\s+page\.waitForTimeout\([0-9]+\);[ \t]*\n?/gm, '');

  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
  }
}
console.log("Removed all waitForTimeout");
