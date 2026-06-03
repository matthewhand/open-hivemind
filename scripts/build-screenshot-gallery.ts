#!/usr/bin/env tsx
/**
 * Generates docs/screenshots/index.html — a PhotoSwipe v5 gallery
 * built from docs/screenshots/README.md (source of truth) plus the
 * PNG files on disk.
 *
 * Run:  npx tsx scripts/build-screenshot-gallery.ts
 *   or:  npm run gallery
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(ROOT, 'docs/screenshots');
const README_PATH = path.join(SCREENSHOTS_DIR, 'README.md');
const OUTPUT_PATH = path.join(SCREENSHOTS_DIR, 'index.html');

const PSWP_VERSION = '5.4.4';

interface Entry {
  alt: string;
  file: string;
  description: string;
}

interface Section {
  title: string;
  entries: Entry[];
}

function readPngDimensions(filePath: string): { width: number; height: number } {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(24);
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseReadme(content: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  const ROW_RE = /^\|\s*!\[([^\]]+)\]\(([^)]+\.png)\)\s*\|\s*(.+?)\s*\|\s*$/;

  for (const line of content.split('\n')) {
    const h2 = /^##\s+(.+?)\s*$/.exec(line);
    if (h2) {
      const title = h2[1].trim();
      // Skip the "How to Regenerate Screenshots" section and any heading that
      // doesn't look like a category.
      if (/regenerate/i.test(title)) {
        current = null;
        continue;
      }
      current = { title, entries: [] };
      sections.push(current);
      continue;
    }
    if (!current) continue;
    const row = ROW_RE.exec(line);
    if (row) {
      current.entries.push({
        alt: row[1].trim(),
        file: row[2].trim(),
        description: row[3].trim(),
      });
    }
  }
  return sections.filter((s) => s.entries.length > 0);
}

function findOrphans(sections: Section[]): string[] {
  const documented = new Set<string>();
  for (const s of sections) for (const e of s.entries) documented.add(e.file);
  const onDisk = fs
    .readdirSync(SCREENSHOTS_DIR)
    .filter((f) => f.endsWith('.png'))
    .sort();
  return onDisk.filter((f) => !documented.has(f));
}

function renderEntry(file: string, alt: string, description: string): string {
  const fullPath = path.join(SCREENSHOTS_DIR, file);
  let dims: { width: number; height: number };
  try {
    dims = readPngDimensions(fullPath);
  } catch {
    return `<!-- skipped: ${file} (cannot read) -->`;
  }
  const safeAlt = escapeHtml(alt);
  const safeDesc = escapeHtml(description);
  return `
        <a href="${file}"
           data-pswp-width="${dims.width}"
           data-pswp-height="${dims.height}"
           target="_blank"
           rel="noreferrer">
          <img src="${file}" alt="${safeAlt}" loading="lazy">
          <span class="caption">${safeDesc}</span>
          <span class="filename">${file}</span>
        </a>`;
}

function renderSection(s: Section): string {
  const id = `gallery-${slugify(s.title)}`;
  const cards = s.entries
    .map((e) => renderEntry(e.file, e.alt, e.description))
    .join('');
  return `
  <section>
    <h2>${escapeHtml(s.title)} <span class="count">${s.entries.length}</span></h2>
    <div class="gallery" id="${id}">${cards}
    </div>
  </section>`;
}

function renderOrphans(files: string[]): string {
  if (files.length === 0) return '';
  const cards = files
    .map((f) =>
      renderEntry(f, f, '⚠️ Not documented in README.md — add or remove'),
    )
    .join('');
  return `
  <section>
    <h2>Undocumented orphans <span class="count">${files.length}</span></h2>
    <p class="note">These PNGs exist in <code>docs/screenshots/</code> but are not
    listed in <code>README.md</code>. Either add an entry or remove the file.</p>
    <div class="gallery" id="gallery-orphans">${cards}
    </div>
  </section>`;
}

function buildHtml(sections: Section[], orphans: string[]): string {
  const totalDocumented = sections.reduce((n, s) => n + s.entries.length, 0);
  const sectionsHtml = sections.map(renderSection).join('\n');
  const orphansHtml = renderOrphans(orphans);
  const galleryIds = [
    ...sections.map((s) => `gallery-${slugify(s.title)}`),
    ...(orphans.length ? ['gallery-orphans'] : []),
  ];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Open-Hivemind — Screenshot Gallery</title>
  <link rel="stylesheet" href="https://unpkg.com/photoswipe@${PSWP_VERSION}/dist/photoswipe.css">
  <style>
    :root {
      color-scheme: light dark;
      --bg: #fafafa;
      --fg: #1a1a1a;
      --muted: #555;
      --subtle: #888;
      --border: #ddd;
      --card-bg: #fff;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #141414;
        --fg: #e4e4e4;
        --muted: #a8a8a8;
        --subtle: #6a6a6a;
        --border: #2a2a2a;
        --card-bg: #1c1c1c;
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      max-width: 1600px;
      margin: 0 auto;
      padding: 24px;
      background: var(--bg);
      color: var(--fg);
      line-height: 1.5;
    }
    header { margin-bottom: 32px; }
    header h1 { margin: 0 0 8px; font-size: 28px; }
    header p { margin: 0; color: var(--muted); font-size: 14px; }
    h2 {
      margin: 32px 0 12px;
      font-size: 18px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 6px;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    h2 .count {
      font-size: 12px;
      color: var(--subtle);
      font-weight: normal;
    }
    .note {
      font-size: 13px;
      color: var(--muted);
      margin: 0 0 12px;
    }
    .note code {
      background: var(--card-bg);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 12px;
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .gallery a {
      display: flex;
      flex-direction: column;
      gap: 6px;
      text-decoration: none;
      color: inherit;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px;
      transition: border-color 0.15s ease, transform 0.15s ease;
    }
    .gallery a:hover {
      border-color: var(--subtle);
      transform: translateY(-1px);
    }
    .gallery img {
      width: 100%;
      height: auto;
      aspect-ratio: 16 / 10;
      object-fit: cover;
      object-position: top;
      border-radius: 4px;
      background: var(--border);
    }
    .gallery .caption {
      font-size: 13px;
      color: var(--fg);
      line-height: 1.4;
    }
    .gallery .filename {
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 11px;
      color: var(--subtle);
    }
    .toc {
      margin: 16px 0 32px;
      padding: 12px 16px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 13px;
    }
    .toc strong { display: block; margin-bottom: 6px; }
    .toc a {
      display: inline-block;
      margin: 2px 12px 2px 0;
      color: var(--fg);
      text-decoration: none;
      border-bottom: 1px dotted var(--subtle);
    }
    .toc a:hover { border-bottom-style: solid; }
  </style>
</head>
<body>
  <header>
    <h1>Open-Hivemind — Screenshot Gallery</h1>
    <p>
      ${totalDocumented} documented screenshot${totalDocumented === 1 ? '' : 's'} across
      ${sections.length} section${sections.length === 1 ? '' : 's'}${orphans.length ? `, plus ${orphans.length} undocumented` : ''}.
      Click any image to open in lightbox. Source of truth: <code>docs/screenshots/README.md</code>.
    </p>
  </header>
  <nav class="toc">
    <strong>Jump to:</strong>
    ${sections
      .map((s) => `<a href="#gallery-${slugify(s.title)}">${escapeHtml(s.title)}</a>`)
      .join('')}
    ${orphans.length ? `<a href="#gallery-orphans">Undocumented orphans</a>` : ''}
  </nav>
  ${sectionsHtml}
  ${orphansHtml}
  <script type="module">
    import PhotoSwipeLightbox from 'https://unpkg.com/photoswipe@${PSWP_VERSION}/dist/photoswipe-lightbox.esm.js';
    const ids = ${JSON.stringify(galleryIds)};
    for (const id of ids) {
      new PhotoSwipeLightbox({
        gallery: '#' + id,
        children: 'a',
        pswpModule: () => import('https://unpkg.com/photoswipe@${PSWP_VERSION}/dist/photoswipe.esm.js'),
      }).init();
    }
  </script>
</body>
</html>
`;
}

const readme = fs.readFileSync(README_PATH, 'utf8');
const sections = parseReadme(readme);
const orphans = findOrphans(sections);
const html = buildHtml(sections, orphans);
fs.writeFileSync(OUTPUT_PATH, html);

const totalDocumented = sections.reduce((n, s) => n + s.entries.length, 0);
console.log(
  `Wrote ${path.relative(ROOT, OUTPUT_PATH)} — ${totalDocumented} documented, ${orphans.length} orphans across ${sections.length} sections.`,
);
