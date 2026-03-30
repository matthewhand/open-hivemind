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

  // Let's find cases where `await page.waitForTimeout(...)` is followed by `await page.screenshot(...)`.
  // We already replaced these with `domcontentloaded`. Let's just remove them.
  newContent = newContent.replace(/^[ \t]*await\s+page\.waitForTimeout\([^)]+\);[ \t]*\n([ \t]*await\s+(?:page\.|[a-zA-Z0-9_]+\.)?screenshot\()/gm, 'await page.waitForLoadState("domcontentloaded");\n$1');

  // Let's find cases where `await page.waitForTimeout(...)` is followed by variable declaration + `.isVisible()`
  // E.g.:
  // await page.waitForTimeout(500);
  // const myLoc = page.locator('...');
  // if (await myLoc.isVisible()) {
  // It should be `myLoc.waitFor({ state: 'attached', timeout: 500 }).catch(() => {})`

  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
  }
}
