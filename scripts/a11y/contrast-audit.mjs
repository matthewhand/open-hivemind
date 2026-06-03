#!/usr/bin/env node
/**
 * Kill-switch contrast audit across DaisyUI themes used by open-hivemind.
 *
 * What this measures
 * ------------------
 * The navbar kill-switch trigger is rendered as `btn btn-ghost text-error`
 * sitting on the navbar surface (`bg-base-100`). PR #2710 dropped the
 * `text-error/60` opacity to `text-error` and claimed WCAG 2.2 SC 1.4.11
 * (3:1 non-text contrast) compliance — without measurement.
 *
 * This script reads `--color-error` and `--color-base-100` from each
 * DaisyUI theme stylesheet under `node_modules/daisyui/theme/<name>.css`,
 * converts the OKLCH values to sRGB, and computes the WCAG 2.x
 * relative-luminance contrast ratio between the two.
 *
 * It then evaluates each theme against:
 *   - SC 1.4.11 Non-text Contrast: ratio >= 3:1 (icon glyph)
 *   - SC 1.4.3  Contrast (Minimum) for small text: ratio >= 4.5:1
 *
 * Usage
 * -----
 *   node scripts/a11y/contrast-audit.mjs
 *   node scripts/a11y/contrast-audit.mjs --json   # machine-readable output
 *
 * No external runtime dependencies. The OKLCH -> linear-sRGB conversion
 * is taken from the CSS Color Module Level 4 sample code (Björn Ottosson's
 * Oklab); WCAG luminance follows WCAG 2.x section 1.4.3.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Locate daisyui's installed theme stylesheets. In a git worktree the local
// node_modules may not exist; in that case fall back to the primary repo
// checkout on disk by walking parents and `.claude/worktrees/<...>/`.
function findDaisyuiThemeDir() {
  const candidates = [];
  let dir = resolve(__dirname, '..', '..');
  for (let i = 0; i < 6; i++) {
    candidates.push(resolve(dir, 'node_modules', 'daisyui', 'theme'));
    dir = resolve(dir, '..');
  }
  // If we are inside `.claude/worktrees/<id>/`, also try the primary checkout.
  const m = /^(.*)\/\.claude\/worktrees\/[^/]+/.exec(__dirname);
  if (m) candidates.push(resolve(m[1], 'node_modules', 'daisyui', 'theme'));
  for (const c of candidates) {
    if (existsSync(resolve(c, 'light.css'))) return c;
  }
  throw new Error(
    'Could not locate node_modules/daisyui/theme. Run `npm install` first.'
  );
}

const THEME_DIR = findDaisyuiThemeDir();

// Themes the project actually enables. Keep in sync with src/client/src/index.css
// `@plugin "daisyui" { themes: ... }`.
const THEMES = [
  'dark', 'night', 'light', 'dracula', 'cupcake', 'emerald', 'corporate',
  'synthwave', 'cyberpunk', 'forest', 'aqua', 'business', 'coffee',
  'dim', 'nord', 'sunset',
];

// ---------------------------------------------------------------------------
// Color math
// ---------------------------------------------------------------------------

// Oklab -> linear sRGB, per CSS Color 4 (Björn Ottosson).
function oklabToLinearSrgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

function oklchToLinearSrgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  return oklabToLinearSrgb(L, a, b);
}

// Linear sRGB component -> sRGB gamma-encoded [0,1] (then clipped).
function linearToSrgb(c) {
  const sign = c < 0 ? -1 : 1;
  const abs = Math.abs(c);
  const v = abs <= 0.0031308 ? 12.92 * abs : 1.055 * abs ** (1 / 2.4) - 0.055;
  return sign * v;
}

function clip01(c) {
  return Math.max(0, Math.min(1, c));
}

// WCAG relative luminance from sRGB gamma-encoded [0,1].
function relLuminance([r, g, b]) {
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(srgbA, srgbB) {
  const L1 = relLuminance(srgbA);
  const L2 = relLuminance(srgbB);
  const [hi, lo] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

function oklchToSrgb([L, C, h]) {
  const lin = oklchToLinearSrgb(L, C, h);
  return lin.map((c) => clip01(linearToSrgb(c)));
}

function srgbToHex([r, g, b]) {
  const to255 = (c) => Math.round(c * 255);
  const hex = (n) => n.toString(16).padStart(2, '0');
  return '#' + hex(to255(r)) + hex(to255(g)) + hex(to255(b));
}

// ---------------------------------------------------------------------------
// CSS parsing
// ---------------------------------------------------------------------------

// Match `oklch(<L>% <C> <h>)`. L is a percentage; C and h are unitless.
const OKLCH_RE = /oklch\(\s*([0-9.]+)%\s+([0-9.]+)\s+([0-9.]+)\s*\)/;

function parseOklch(value) {
  const m = OKLCH_RE.exec(value);
  if (!m) throw new Error(`Cannot parse oklch(): ${value}`);
  return [parseFloat(m[1]) / 100, parseFloat(m[2]), parseFloat(m[3])];
}

function readVar(css, name) {
  const re = new RegExp(`--${name}\\s*:\\s*([^;]+);`);
  const m = re.exec(css);
  if (!m) throw new Error(`Variable --${name} not found`);
  return m[1].trim();
}

function loadThemeColors(theme) {
  const path = resolve(THEME_DIR, `${theme}.css`);
  const css = readFileSync(path, 'utf8');
  return {
    error: parseOklch(readVar(css, 'color-error')),
    base100: parseOklch(readVar(css, 'color-base-100')),
    errorContent: parseOklch(readVar(css, 'color-error-content')),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function audit() {
  const rows = [];
  for (const theme of THEMES) {
    let oklch;
    try {
      oklch = loadThemeColors(theme);
    } catch (err) {
      rows.push({ theme, error: err.message });
      continue;
    }
    const errSrgb = oklchToSrgb(oklch.error);
    const baseSrgb = oklchToSrgb(oklch.base100);
    const errContentSrgb = oklchToSrgb(oklch.errorContent);

    // Pairing A: pre-fix `btn-ghost text-error` -> error glyph on base-100.
    const oldRatio = contrastRatio(errSrgb, baseSrgb);
    // Pairing B: post-fix `btn-error` -> error-content glyph on error fill.
    const newRatio = contrastRatio(errContentSrgb, errSrgb);

    rows.push({
      theme,
      errorHex: srgbToHex(errSrgb),
      base100Hex: srgbToHex(baseSrgb),
      errorContentHex: srgbToHex(errContentSrgb),
      ghostOnBaseRatio: Math.round(oldRatio * 100) / 100,
      ghostPassesNonText: oldRatio >= 3,          // SC 1.4.11
      ghostPassesSmallText: oldRatio >= 4.5,      // SC 1.4.3
      filledOnErrorRatio: Math.round(newRatio * 100) / 100,
      filledPassesNonText: newRatio >= 3,
      filledPassesSmallText: newRatio >= 4.5,
    });
  }
  return rows;
}

function formatTable(rows) {
  const head = [
    'Theme',
    '--color-error',
    '--color-base-100',
    '--color-error-content',
    'btn-ghost text-error vs base-100',
    '>= 3:1',
    '>= 4.5:1',
    'btn-error (content vs error)',
    '>= 3:1',
    '>= 4.5:1',
  ];
  const lines = [
    '| ' + head.join(' | ') + ' |',
    '|' + head.map(() => '---').join('|') + '|',
  ];
  for (const r of rows) {
    if (r.error) {
      lines.push(`| ${r.theme} | ERROR | - | - | - | - | - | - | - | - |`);
      continue;
    }
    lines.push('| ' + [
      r.theme,
      r.errorHex,
      r.base100Hex,
      r.errorContentHex,
      r.ghostOnBaseRatio.toFixed(2),
      r.ghostPassesNonText ? 'PASS' : 'FAIL',
      r.ghostPassesSmallText ? 'PASS' : 'FAIL',
      r.filledOnErrorRatio.toFixed(2),
      r.filledPassesNonText ? 'PASS' : 'FAIL',
      r.filledPassesSmallText ? 'PASS' : 'FAIL',
    ].join(' | ') + ' |');
  }
  return lines.join('\n');
}

const rows = audit();

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
} else {
  process.stdout.write(formatTable(rows) + '\n');
  const ghostFailures = rows.filter((r) => !r.ghostPassesNonText);
  const filledFailures = rows.filter((r) => !r.filledPassesNonText);
  process.stdout.write(
    `\nThemes failing 3:1 (SC 1.4.11) for btn-ghost text-error: ${ghostFailures.length}` +
    ` (${ghostFailures.map((r) => r.theme).join(', ') || 'none'})\n`
  );
  process.stdout.write(
    `Themes failing 3:1 (SC 1.4.11) for btn-error filled:        ${filledFailures.length}` +
    ` (${filledFailures.map((r) => r.theme).join(', ') || 'none'})\n`
  );
  // Exit non-zero only if the post-fix pairing fails anywhere — that is the
  // pairing the navbar actually ships.
  process.exit(filledFailures.length === 0 ? 0 : 1);
}
