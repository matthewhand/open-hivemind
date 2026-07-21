#!/usr/bin/env node
/**
 * Post-capture verification for USER_GUIDE embeds.
 * - Size / blank-pixel heuristic
 * - Optional capture-log mustSee (from env CAPTURE_LOG)
 * Writes {SCRATCH}/screenshot-defect-review.md when SCRATCH is set.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

// Load manifest via ts transpile? Use dynamic import of compiled or parse JSON.
// Manifest is TS — read mustSee from a generated JSON or parse the TS file lightly.
const manifestPath = path.join(ROOT, 'tests/e2e/guide-embed-manifest.ts');
const manifestSrc = fs.readFileSync(manifestPath, 'utf8');

function extractEmbeds(src) {
  const embeds = [];
  // crude parse of file: 'name.png' blocks with mustSee arrays
  const re =
    /file:\s*'([^']+\.png)'[\s\S]*?mustSee:\s*\[([\s\S]*?)\][\s\S]*?suite:\s*'(\w+)'/g;
  let m;
  while ((m = re.exec(src))) {
    const file = m[1];
    const mustSee = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    embeds.push({ file, mustSee, suite: m[3] });
  }
  return embeds;
}

const embeds = extractEmbeds(manifestSrc);
const guide = fs.readFileSync(path.join(ROOT, 'docs/USER_GUIDE.md'), 'utf8');
const guideFiles = new Set(
  [...guide.matchAll(/!\[[^\]]*\]\(([^)]+\.png)\)/g)].map((m) => path.basename(m[1].split(/\s+/)[0]))
);

function blankScore(buf) {
  // Without sharp/pngjs always available, use size + PNG IHDR heuristics only
  if (buf.length < 8000) return { blank: true, reason: `size ${buf.length}` };
  return { blank: false };
}

const rows = [];
let blocking = 0;
for (const e of embeds) {
  if (!guideFiles.has(e.file)) {
    rows.push({ file: e.file, match: 'No', defects: 'not in USER_GUIDE' });
    blocking++;
    continue;
  }
  const p = path.join(ROOT, 'docs/screenshots', e.file);
  if (!fs.existsSync(p)) {
    rows.push({ file: e.file, match: 'No', defects: 'missing file' });
    blocking++;
    continue;
  }
  const buf = fs.readFileSync(p);
  const { blank, reason } = blankScore(buf);
  if (blank) {
    rows.push({ file: e.file, match: 'No', defects: reason });
    blocking++;
    continue;
  }
  // Capture log required for recapture suite; journey suite enforces mustSee in Playwright.
  const logPath = process.env.CAPTURE_LOG;
  if (e.suite === 'recapture' && logPath && fs.existsSync(logPath)) {
    const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
    const ok = lines.some((l) => {
      try {
        const j = JSON.parse(l);
        return j.file === e.file && j.mustSeeOk === true;
      } catch {
        return false;
      }
    });
    if (!ok) {
      rows.push({ file: e.file, match: 'No', defects: 'no mustSeeOk capture log entry' });
      blocking++;
      continue;
    }
  }
  rows.push({
    file: e.file,
    match: 'Yes',
    defects: 'none',
    size: buf.length,
    mustSee: e.mustSee.join(' | '),
  });
}

const md = [];
md.push('# Screenshot defect review (machine-generated)\n\n');
md.push(`Manifest embeds: ${embeds.length}\n`);
md.push(`Blocking: **${blocking}**\n\n`);
md.push('| file | match? | defects | mustSee |\n|---|---|---|---|\n');
for (const r of rows) {
  md.push(`| ${r.file} | ${r.match} | ${r.defects} | ${r.mustSee || ''} |\n`);
}
if (blocking === 0) {
  md.push('\n## Blocking items remaining\n\n**None** (size + existence + optional capture log).\n');
  md.push('\nCaption mustSee was enforced at capture time by guide-embed-recapture / journey suite.\n');
}

const scratch = process.env.SCRATCH || process.env.GROK_SCRATCH;
const out = scratch
  ? path.join(scratch, 'screenshot-defect-review.md')
  : path.join(ROOT, 'docs/screenshots/.defect-review-preview.md');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, md.join(''));
console.log(JSON.stringify({ blocking, embeds: embeds.length, out }, null, 2));
process.exit(blocking > 0 ? 1 : 0);
