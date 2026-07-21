import fs from 'fs';
import path from 'path';
import { ALL_GUIDE_EMBEDS, RECAPTURE_EMBEDS } from '../e2e/guide-embed-manifest';

const ROOT = path.resolve(__dirname, '../..');
const GUIDE = path.join(ROOT, 'docs/USER_GUIDE.md');

function guidePngBasenames(): string[] {
  const text = fs.readFileSync(GUIDE, 'utf8');
  const names: string[] = [];
  const re = /!\[[^\]]*\]\(([^)]+\.png)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const base = path.basename(m[1].split(/\s+/)[0]);
    if (!names.includes(base)) names.push(base);
  }
  return names;
}

describe('guide-embed-manifest ↔ USER_GUIDE', () => {
  it('every recapture/journey manifest entry has mustSee and is in USER_GUIDE', () => {
    const guide = guidePngBasenames();
    const missingMust = RECAPTURE_EMBEDS.filter((e) => !e.mustSee?.length);
    expect(missingMust).toEqual([]);

    for (const e of ALL_GUIDE_EMBEDS) {
      expect(e.mustSee.length).toBeGreaterThan(0);
      expect(e.routeOrFlow).toBeTruthy();
      expect(guide).toContain(e.file);
    }
  });

  it('clone-bot and demo-mode embeds require caption-specific mustSee', () => {
    const clone = ALL_GUIDE_EMBEDS.find((e) => e.file === 'clone-bot-modal.png');
    expect(clone?.mustSee.some((s) => /clone|duplicate/i.test(s))).toBe(true);

    const banner = ALL_GUIDE_EMBEDS.find((e) => e.file === 'demo-mode-banner.png');
    expect(banner?.mustSee).toEqual(expect.arrayContaining(['Demo Mode Active', 'Get Started']));

    const dash = ALL_GUIDE_EMBEDS.find((e) => e.file === 'demo-mode-dashboard.png');
    expect(dash?.mustSee.some((s) => /Demo Mode Active/i.test(s))).toBe(true);
  });

  it('manifest files are unique', () => {
    const files = ALL_GUIDE_EMBEDS.map((e) => e.file);
    expect(new Set(files).size).toBe(files.length);
  });
});
